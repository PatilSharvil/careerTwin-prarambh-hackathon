.PHONY: verify test run

verify:
	python scripts/verify_contract.py

test:
	cd backend && pytest

run:
	cd backend && uvicorn app.main:app --reload --port 8000
