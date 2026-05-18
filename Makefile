.PHONY: up down backend web seed logs ps

# Docker runs inside WSL2 Ubuntu on this machine.
# Use: wsl -d Ubuntu -- bash -c "service docker start; cd /mnt/d/Claude/zeyvo/infra/docker && docker compose up -d"
# Or run make targets which call wsl automatically.
DOCKER_RUN = wsl -d Ubuntu -- bash -c "service docker start 2>/dev/null; cd /mnt/d/Claude/zeyvo/infra/docker

up:
	$(DOCKER_RUN) && docker compose up -d"
	@echo "Postgres, Redis, RabbitMQ are up."

down:
	$(DOCKER_RUN) && docker compose down"

ps:
	$(DOCKER_RUN) && docker compose ps"

logs:
	$(DOCKER_RUN) && docker compose logs -f"

backend:
	cd backend && ./gradlew :app:bootRun --args='--spring.profiles.active=dev'

web:
	pnpm --filter web dev

seed:
	cd backend && ./gradlew :app:flywayMigrate

test-backend:
	cd backend && ./gradlew test integrationTest

test-web:
	pnpm --filter web test

build-backend:
	cd backend && ./gradlew :app:bootJar

build-web:
	pnpm --filter web build

deploy:
	@bash infra/scripts/deploy.sh
