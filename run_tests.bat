@echo off
echo ==============================================
echo  Running VoteChain Automated Test Suite...
echo ==============================================
cd backend
python -m pytest tests/test_crypto.py tests/test_auth.py tests/test_tamper_detection.py tests/test_voting.py tests/test_results_tally.py -v
pause
