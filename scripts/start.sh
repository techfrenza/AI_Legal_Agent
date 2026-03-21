#!/usr/bin/env bash
# =============================================================================
# AI Legal Agent  Quick Start Script
# Usage: bash scripts/start.sh [up|down|logs|ps]
# =============================================================================
set -euo pipefail

COMPOSE_CMD="podman compose"
command -v podman-compose &>/dev/null && COMPOSE_CMD="podman-compose"

ACTION=${1:-up}

case "$ACTION" in
  up)
    if [ ! -f .env ]; then
      echo "No .env found  copying from .env.example"
      cp .env.example .env
      echo ""
      echo "  ACTION REQUIRED:"
      echo "  Edit .env and set JWT_SECRET_KEY, ENCRYPTION_MASTER_KEY,"
      echo "  and at least one AI key (ANTHROPIC_API_KEY or OPENAI_API_KEY)."
      echo ""
      exit 1
    fi
    echo "Starting AI Legal Agent..."
    $COMPOSE_CMD up --build -d
    echo ""
    echo "Services are starting. Use 'bash scripts/start.sh logs' to watch."
    echo ""
    echo "  Endpoint              URL"
    echo "      "
    echo "  Frontend              http://localhost:3000"
    echo "  API Gateway           http://localhost:8000"
    echo "  AI Orchestrator       http://localhost:8001"
    echo "  Document Service      http://localhost:8002"
    echo "  Compliance Service    http://localhost:8003"
    echo "  Audit Service         http://localhost:8004"
    echo "  Notification Service  http://localhost:8005 (WebSocket: ws://)"
    echo "  Template Service      http://localhost:8006"
    echo "  Integration Service   http://localhost:8007"
    ;;
  down)
    $COMPOSE_CMD down
    ;;
  logs)
    $COMPOSE_CMD logs -f "${2:-}"
    ;;
  ps)
    $COMPOSE_CMD ps
    ;;
  clean)
    echo "Removing containers, images, and volumes..."
    $COMPOSE_CMD down -v --rmi local
    ;;
  *)
    echo "Usage: $0 [up|down|logs|ps|clean]"
    exit 1
    ;;
esac
