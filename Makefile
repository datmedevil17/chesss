.PHONY: up down build logs

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

run:
	docker compose up -d server client

db:
	docker compose up -d db

db-shell:
	docker compose exec -it db psql -U user -d chess_db
