# Blog API Platform (NestJS + TypeORM)

## Project Overview

This is a **NestJS-based backend API** for a blogger platform with user authentication, quiz games, notifications, and testing capabilities. The project uses **TypeORM** with **PostgreSQL** for data persistence and follows **Clean Architecture** principles with separation into controllers, services, repositories, and domain entities.

### Key Features
- **User Accounts Module**: Registration, authentication (JWT, refresh tokens, basic auth), session management, password recovery
- **Quiz Game Module**: Pair-based quiz competition system with matchmaking, question answering, and scoring
- **Bloggers Platform Module**: Blog management functionality
- **Notifications Module**: Email and other notification services
- **JWT Authentication**: Token-based auth with access/refresh token flow
- **Rate Limiting**: Built-in rate limiter for API protection

### Tech Stack
- **Framework**: NestJS v11
- **Language**: TypeScript v5.7
- **Database**: PostgreSQL with TypeORM v0.3
- **Authentication**: Passport, JWT, bcrypt
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest (unit + e2e)
- **State Management**: CQRS pattern (@nestjs/cqrs)

## Project Structure

```
src/
├── core/                    # Shared core utilities, guards, services
│   ├── decorators/
│   ├── domain/
│   ├── dto/
│   ├── exceptions/
│   ├── guards/
│   ├── services/
│   └── utils/
├── db/                      # Database configuration and migrations
│   ├── migrations/
│   ├── tools/
│   └── data-source.ts
├── env/                     # Environment-specific .env files
├── modules/                 # Feature modules (Clean Architecture)
│   ├── user-accounts/       # User management & auth
│   ├── jwt/                 # JWT configuration
│   ├── quiz-game/           # Quiz competition logic
│   ├── blogers-platform/    # Blog functionality
│   ├── notifications/       # Notification services
│   └── testing/             # Testing-specific utilities
├── app.module.ts            # Root module
└── main.ts                  # Application entry point
```

### Module Architecture (Clean Architecture)
Each feature module follows this pattern:
```
module-name/
├── api/             # Controllers (HTTP layer)
├── application/     # Use cases, services, business logic
├── domain/          # Entities, domain models
├── infrastructure/  # Repositories, external integrations
├── dto/             # Data Transfer Objects
├── guards/          # Auth guards
├── validators/      # Custom validators
└── config/          # Module-specific configuration
```

## Building and Running

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- Yarn or npm

### Installation
```bash
yarn install
```

### Environment Setup
Create environment files in `src/env/`:
- `.env.development` - for local development
- `.env.production` - for production
- `.env.testing` - for tests

Required environment variables:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=your_database
NODE_ENV=development
```

### Development
```bash
# Start in watch mode
yarn run start:dev

# Start with debug mode
yarn run start:debug
```

### Production
```bash
# Build
yarn run build

# Run production build
yarn run start:prod
```

### Database Migrations
```bash
# Generate new migration (auto-generates from entities)
yarn migration:generate

# Generate for specific environment
yarn migration:generate:dev
yarn migration:generate:test

# Create empty migration manually
yarn migration:create

# Run migrations
yarn migration:run
yarn migration:run:dev
yarn migration:run:test

# Revert last migration
yarn migration:revert

# Show migration status
yarn migration:show
```

### Testing
```bash
# Unit tests
yarn run test

# Watch mode
yarn run test:watch

# Coverage
yarn run test:cov

# E2E tests (requires INCLUDE_TESTING_MODULE=true)
yarn run test:e2e
```

### Code Quality
```bash
# Lint with auto-fix
yarn run lint

# Format code
yarn run format
```

## Development Conventions

### Code Style
- **Prettier**: Single quotes, trailing commas enabled (see `.prettierrc`)
- **ESLint**: TypeScript ESLint with recommended rules + Prettier integration
- **TypeScript**: Strict null checks enabled, some relaxed rules for implicit any

### Architecture Patterns
- **CQRS**: Command/Query separation for business logic (use cases pattern)
- **Repository Pattern**: Data access abstracted through repositories
- **Dependency Injection**: NestJS DI throughout
- **DTOs**: Separate input DTOs (`.input-dto.ts`) and view DTOs (`.view-dto.ts`)

### Naming Conventions
- Entities: `*Entity` (e.g., `UserEntity`, `SessionEntity`)
- DTOs: `*.input-dto.ts`, `*.view-dto.ts`
- Services: `*Service` (e.g., `UsersService`, `AuthService`)
- Repositories: `*Repository` / `*QueryRepository` (command/query separation)
- Guards: `*Guard` (e.g., `JwtAuthGuard`, `LocalAuthGuard`)
- Use Cases: `*UseCase` (e.g., `LoginUserUseCase`, `RegistrationUseCase`)

### Git Workflow
- Feature branches for new functionality
- Commits should follow conventional commit format
- Run lint and tests before committing

## API Documentation

Swagger documentation is configured via `@nestjs/swagger` plugin. Access at:
- **Development**: `http://localhost:3000/api/docs`

The plugin auto-generates docs from DTOs with decorators:
- `@ApiProperty()` for property descriptions
- `@Is*()` validators from class-validator

## Key Configuration Files

| File | Purpose |
|------|---------|
| `nest-cli.json` | NestJS CLI config, Swagger plugin settings |
| `tsconfig.json` | TypeScript compiler options (ES2023 target) |
| `eslint.config.mjs` | ESLint flat config with TypeScript + Prettier |
| `.prettierrc` | Code formatting rules |
| `package.json` | Dependencies, scripts, Jest config |

## Notes

- **Synchronize is disabled**: Database schema changes require explicit migrations
- **Auto-load entities**: Enabled in TypeORM config for NestJS modules
- **Environment-based config**: Uses `cross-env` for cross-platform env variables
- **Hybrid auth**: Supports JWT, refresh tokens, basic auth, and session-based auth
