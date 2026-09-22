#!/bin/sh
        . "$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"

        CONFIG="Release"
        if echo $GCC_PREPROCESSOR_DEFINITIONS | grep -q "DEBUG=1"; then
          CONFIG="Debug"
        fi

        "$NODE_BINARY" "$REACT_NATIVE_PATH/sdks/hermes-engine/utils/replace_hermes_version.js" -c "$CONFIG" -r "0.81.5" -p "$PODS_ROOT"

