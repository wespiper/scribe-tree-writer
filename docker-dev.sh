#!/bin/bash
# Development Docker helper script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_help() {
    echo "Scribe Tree Writer - Docker Development Helper"
    echo ""
    echo "Usage: ./docker-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up        Start all services"
    echo "  down      Stop all services"
    echo "  build     Build all images"
    echo "  logs      Show logs (follow mode)"
    echo "  test      Run all tests"
    echo "  shell     Access backend shell"
    echo "  db        Access database shell"
    echo "  migrate   Run database migrations"
    echo "  clean     Remove all containers and volumes"
    echo "  status    Show service status"
    echo ""
}

check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Warning: .env file not found${NC}"
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${GREEN}Created .env file. Please update with your values.${NC}"
        exit 1
    fi
}

case "$1" in
    up)
        check_env
        echo -e "${GREEN}Starting services...${NC}"
        docker-compose up -d
        echo -e "${GREEN}Services started!${NC}"
        echo "Frontend: http://localhost:3000"
        echo "Backend:  http://localhost:8000"
        echo "API Docs: http://localhost:8000/docs"
        ;;

    down)
        echo -e "${YELLOW}Stopping services...${NC}"
        docker-compose down
        echo -e "${GREEN}Services stopped!${NC}"
        ;;

    build)
        echo -e "${GREEN}Building images...${NC}"
        docker-compose build
        echo -e "${GREEN}Build complete!${NC}"
        ;;

    logs)
        docker-compose logs -f
        ;;

    test)
        echo -e "${GREEN}Running backend tests...${NC}"
        docker-compose exec backend pytest -v
        echo -e "${GREEN}Running frontend tests...${NC}"
        docker-compose exec frontend npm test
        ;;

    shell)
        docker-compose exec backend python
        ;;

    db)
        docker-compose exec db psql -U postgres -d scribe_tree_writer
        ;;

    migrate)
        echo -e "${GREEN}Running database migrations...${NC}"
        docker-compose exec backend alembic upgrade head
        echo -e "${GREEN}Migrations complete!${NC}"
        ;;

    clean)
        echo -e "${RED}This will remove all containers and volumes!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            echo -e "${GREEN}Cleanup complete!${NC}"
        fi
        ;;

    status)
        echo -e "${GREEN}Service Status:${NC}"
        docker-compose ps
        echo ""
        echo -e "${GREEN}Health Checks:${NC}"
        curl -s http://localhost:8000/health | jq '.' || echo "Backend not responding"
        ;;

    *)
        print_help
        ;;
esac
