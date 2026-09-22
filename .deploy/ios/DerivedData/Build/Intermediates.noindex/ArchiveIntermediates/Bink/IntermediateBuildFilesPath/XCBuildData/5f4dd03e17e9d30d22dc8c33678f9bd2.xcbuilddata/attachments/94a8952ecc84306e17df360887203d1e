#!/bin/sh
pushd "$PODS_ROOT/../" > /dev/null
RCT_SCRIPT_POD_INSTALLATION_ROOT=$(pwd)
popd >/dev/null

export RCT_SCRIPT_RN_DIR="$RCT_SCRIPT_POD_INSTALLATION_ROOT/../../../node_modules/react-native"
export RCT_SCRIPT_APP_PATH="$RCT_SCRIPT_POD_INSTALLATION_ROOT/.."
export RCT_SCRIPT_OUTPUT_DIR="$RCT_SCRIPT_POD_INSTALLATION_ROOT"
export RCT_SCRIPT_TYPE="withCodegenDiscovery"

export SCRIPT_PHASES_SCRIPT="$RCT_SCRIPT_RN_DIR/scripts/react_native_pods_utils/script_phases.sh"
export WITH_ENVIRONMENT="$RCT_SCRIPT_RN_DIR/scripts/xcode/with-environment.sh"
/bin/sh -c '"$WITH_ENVIRONMENT" "$SCRIPT_PHASES_SCRIPT"'

