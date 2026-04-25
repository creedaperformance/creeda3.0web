# Guided Movement Diagnostic API

All endpoints require an authenticated Supabase web session. Mutation endpoints enforce JSON content type and trusted origin checks.

## Start session

`POST /api/diagnostic/sessions`

Input:

```json
{
  "complaint_text": "My knees hurt in squats",
  "sport_context": "gym",
  "user_context": { "role": "individual" }
}
```

Output:

- `session`
- `classification`
- `safety`
- `questions`

## Submit follow-up answers

`POST /api/diagnostic/sessions/:id/followups`

The active V1 UI sends open-ended chatbot answers. Older structured answer types remain accepted for backward compatibility, but new clients should use `answer_type: "open_text"`.

Input:

```json
{
  "answers": [
    {
      "question_key": "movement_story",
      "answer_value": "Both knees feel achy, around 4 out of 10, near the bottom of the squat.",
      "answer_type": "open_text"
    },
    {
      "question_key": "context_story",
      "answer_value": "It happens during squats at the gym and has been going on for a few weeks.",
      "answer_type": "open_text"
    },
    {
      "question_key": "safety_story",
      "answer_value": "No swelling, locking, numbness, sharp pain, or trouble bearing weight.",
      "answer_type": "open_text"
    }
  ]
}
```

Output:

- updated `classification`
- `safety`
- either more open-ended `questions` or exactly one `prescribedTest`

## Get prescribed movement test

`GET /api/diagnostic/sessions/:id/test`

Output:

- `test`
- `camera.defaultCamera = "back"`
- `camera.oneAngleOnly = true`

## Create upload session

`POST /api/diagnostic/sessions/:id/video-upload`

Input:

```json
{
  "test_id": "bodyweight_squat",
  "camera_used": "back",
  "device_metadata": { "viewport": { "width": 390, "height": 844 } }
}
```

Output:

V1 returns `mode: "local_analysis_only"`. It creates a capture row but does not upload raw video.

## Submit video analysis

`POST /api/diagnostic/sessions/:id/analyze`

Input includes `test_id`, optional `video_reference`, optional `device_metadata`, and `raw_engine_payload`.

Output:

- `jobState`
- `result`

## Get result

`GET /api/diagnostic/sessions/:id/result`

Output:

- normalized metrics
- movement scores
- interpretation
- action plan
- safety state

Raw engine payload is not exposed in the result response.

## List history

`GET /api/diagnostic/history`

Output:

- prior sessions
- complaint
- status
- date
- key finding if available
