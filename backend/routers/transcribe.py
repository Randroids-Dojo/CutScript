"""Transcription endpoint using WhisperX."""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.transcription import transcribe_audio
from services.diarization import diarize_and_label

logger = logging.getLogger(__name__)
router = APIRouter()


class TranscribeRequest(BaseModel):
    file_path: str
    model: str = "base"
    language: Optional[str] = None
    use_gpu: bool = True
    use_cache: bool = True
    diarize: bool = False
    hf_token: Optional[str] = None
    num_speakers: Optional[int] = None


@router.post("/transcribe")
async def transcribe(req: TranscribeRequest):
    try:
        result = transcribe_audio(
            file_path=req.file_path,
            model_name=req.model,
            use_gpu=req.use_gpu,
            use_cache=req.use_cache,
            language=req.language,
        )

        if req.diarize and req.hf_token:
            result = diarize_and_label(
                transcription_result=result,
                audio_path=req.file_path,
                hf_token=req.hf_token,
                num_speakers=req.num_speakers,
                use_gpu=req.use_gpu,
            )

        return result

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {req.file_path}")
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe/stream")
async def transcribe_stream(req: TranscribeRequest):
    """SSE endpoint that streams stage-by-stage progress then returns the result."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)

    def progress_cb(pct: int, label: str):
        loop.call_soon_threadsafe(queue.put_nowait, {"progress": pct, "label": label})

    async def run():
        try:
            result = await loop.run_in_executor(None, lambda: transcribe_audio(
                file_path=req.file_path,
                model_name=req.model,
                use_gpu=req.use_gpu,
                use_cache=req.use_cache,
                language=req.language,
                progress_cb=progress_cb,
            ))
            if req.diarize and req.hf_token:
                result = await loop.run_in_executor(None, lambda: diarize_and_label(
                    transcription_result=result,
                    audio_path=req.file_path,
                    hf_token=req.hf_token,
                    num_speakers=req.num_speakers,
                    use_gpu=req.use_gpu,
                ))
            queue.put_nowait({"progress": 100, "label": "Done", "result": result})
        except Exception as e:
            logger.error(f"Transcription failed: {e}", exc_info=True)
            queue.put_nowait({"error": str(e)})
        finally:
            queue.put_nowait(None)

    task = asyncio.create_task(run())

    async def generate():
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield f"data: {json.dumps(item)}\n\n"
        finally:
            # Cancel the background task if the client disconnects before completion.
            task.cancel()

    return StreamingResponse(generate(), media_type="text/event-stream")
