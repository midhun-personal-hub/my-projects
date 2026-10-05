#!/usr/bin/env bash
# ==============================================================================
# ENTERPRISE SHAREPOINT MANAGEMENT PLATFORM - SCAFFOLDING SCRIPT
# ==============================================================================
# Generates the modular, feature-based directory structure inside /src
# ==============================================================================

set -e

echo "Scaffolding enterprise feature-based directory structure in src/..."

# Core Application & Infrastructure Folders
mkdir -p src/app
mkdir -p src/auth
mkdir -p src/api
mkdir -p src/config

# Modular Feature Domains
mkdir -p src/features/dashboard
mkdir -p src/features/workplaces
mkdir -p src/features/menus
mkdir -p src/features/projects
mkdir -p src/features/documents

# Atomic Components
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/forms
mkdir -p src/components/tables

# Shared Utilities & Hooks
mkdir -p src/hooks
mkdir -p src/services
mkdir -p src/schemas
mkdir -p src/types
mkdir -p src/utils

echo "Directory scaffolding complete!"
