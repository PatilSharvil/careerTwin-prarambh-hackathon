.PHONY: run test eval seed warm verify

run:
	uvicorn app.main:app --reload --port 8000

test:
	pytest

eval:
	pytest -q && python -m eval.run_eval

seed:
	@echo not implemented yet

warm:
	@echo not implemented yet

verify:
	python scripts/verify_contract.py
