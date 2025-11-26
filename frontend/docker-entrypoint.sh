#!/bin/sh
# =============================================================================
# FaithFlow Frontend Docker Entrypoint
# Injects runtime environment variables into the built React app
# =============================================================================

set -e

# Directory containing built assets
BUILD_DIR=/usr/share/nginx/html

# Create runtime config file
echo "window.__RUNTIME_CONFIG__ = {" > ${BUILD_DIR}/runtime-config.js
echo "  API_URL: \"${REACT_APP_API_URL:-}\"," >> ${BUILD_DIR}/runtime-config.js
echo "  APP_NAME: \"${REACT_APP_NAME:-FaithFlow}\"," >> ${BUILD_DIR}/runtime-config.js
echo "  APP_VERSION: \"${REACT_APP_VERSION:-2.0.0}\"," >> ${BUILD_DIR}/runtime-config.js
echo "  ENVIRONMENT: \"${NODE_ENV:-production}\"" >> ${BUILD_DIR}/runtime-config.js
echo "};" >> ${BUILD_DIR}/runtime-config.js

echo "Runtime config created with API_URL: ${REACT_APP_API_URL:-'(not set)'}"

# Inject runtime-config.js into index.html if not already present
if ! grep -q "runtime-config.js" ${BUILD_DIR}/index.html; then
    sed -i 's|</head>|<script src="/runtime-config.js"></script></head>|' ${BUILD_DIR}/index.html
    echo "Injected runtime-config.js into index.html"
fi

# Execute the main command (nginx)
exec "$@"
