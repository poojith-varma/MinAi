@echo off

echo Activating virtual environment...
call venv\Scripts\activate

echo Starting MinAI backend server...
python -m uvicorn main:app --reload

pause