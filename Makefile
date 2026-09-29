# ============================================================
# Makefile — Canteen VWA
# ============================================================
# Cách dùng: make <target>
# Xem tất cả: make help
# ============================================================

.PHONY: help install dev dev-fe dev-be build preview \
        docker-build docker-fe docker-be docker-up docker-down \
        clean reset-db lint format test

# ---------- Help ----------
help:
	@echo "Canteen VWA — Available commands:"
	@echo ""
	@echo "  make install          Cài dependencies"
	@echo "  make dev              Chạy FE + BE song song"
	@echo "  make dev-fe           Chỉ chạy frontend (Vite :5173)"
	@echo "  make dev-be           Chỉ chạy backend (Express :3000)"
	@echo "  make build            Build frontend production"
	@echo "  make preview          Preview bản build"
	@echo "  make docker-build     Build cả 2 Docker image"
	@echo "  make docker-up        Chạy docker-compose"
	@echo "  make docker-down      Dừng docker-compose"
	@echo "  make clean            Xoá node_modules + dist"
	@echo "  make reset-db         Reset canteen-db.json về seed"
	@echo "  make lint             Chạy ESLint"
	@echo ""

# ---------- Install ----------
install:
	npm install

# ---------- Dev ----------
dev:
	@echo "🚀 Chạy FE + BE song song... (Ctrl+C để dừng)"
	@npm run dev:all

dev-fe:
	npm run dev

dev-be:
	node server-json.js

# ---------- Build ----------
build:
	npm run build

preview:
	npm run preview

# ---------- Docker ----------
docker-build:
	@echo "🐳 Build frontend..."
	docker build -t canteen-frontend .
	@echo "🐳 Build backend..."
	docker build -f Dockerfile.backend -t canteen-backend .

docker-fe:
	docker build -t canteen-frontend . && \
	docker run --rm -p 8080:80 canteen-frontend

docker-be:
	docker build -f Dockerfile.backend -t canteen-backend . && \
	docker run --rm -p 3000:3000 --env-file .env canteen-backend

docker-up:
	docker compose up -d

docker-down:
	docker compose down

# ---------- Clean ----------
clean:
	@echo "🧹 Xoá node_modules, dist, cache..."
	rm -rf node_modules dist .vite .parcel-cache
	@echo "✅ Xong"

# ---------- Reset DB ----------
reset-db:
	@echo "⚠️  Reset canteen-db.json về seed..."
	@if [ -f canteen-db.backup.json ]; then \
		cp canteen-db.backup.json canteen-db.json; \
		echo "✅ Đã restore từ backup"; \
	else \
		cp canteen-db.json canteen-db.backup.json; \
		echo "✅ Đã tạo backup mới"; \
	fi

# ---------- Lint ----------
lint:
	npm run lint

format:
	npm run format

# ---------- Test ----------
test:
	npm test

# ---------- Git shortcuts ----------
push:
	git add .
	git commit -m "chore: auto-commit"
	git push