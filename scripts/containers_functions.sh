#!/bin/bash

source ./scripts/common_functions.sh

set -e

export CLUSTER_NAME='sample-kubernetes-gab'
export KUBERNETES_SERVICE_PLUGIN_NAME='kubernetes-service'
export CONTAINER_REGISTRY_PLUGIN_NAME='container-registry'
export KUBERNETES_VERSION='1.9.9'
export KUBECTL_VERSION='1.9.0'

export CLOUDANT_SERVICE_INSTANCE='sample-cloudant-gab'
export CLOUDANT_SERVICE_NAME='cloudantNoSQLDB'
export CLOUDANT_SERVICE_PLAN='Lite'
export CLOUDANT_SERVICE_KEY='credentials1'

NAMESPACE='gdecapoa'

CHART_PATH='./chart/nodejs-kubernetes-sample'

function substitute_variables_in_secret {
    sed -i.bak -e "s/%CLOUDANT_URL%/${CLOUDANT_URL}/g" $1
}

function check_kubernetes_service_plugin {
    echo -e "${BLUE_COLOR}Verify if ${KUBERNETES_SERVICE_PLUGIN_NAME} plugin is installed${NO_COLOR}"
    plugin=$(bx plugin list | grep ${KUBERNETES_SERVICE_PLUGIN_NAME} | wc -l )
    if [[ ${plugin} -eq 1 ]]; then
        echo -e "${GREEN_COLOR}${KUBERNETES_SERVICE_PLUGIN_NAME} plugin already installed. Updating...${NO_COLOR}"
        bx plugin update ${KUBERNETES_SERVICE_PLUGIN_NAME} -r Bluemix
        echo -e "${GREEN_COLOR}${KUBERNETES_SERVICE_PLUGIN_NAME} plugin updated${NO_COLOR}"
    else
        echo -e "${YELLOW_COLOR}${KUBERNETES_SERVICE_PLUGIN_NAME} plugin not installed. Installing...${NO_COLOR}"
        bx plugin install ${KUBERNETES_SERVICE_PLUGIN_NAME} -r Bluemix
        echo -e "${GREEN_COLOR}${KUBERNETES_SERVICE_PLUGIN_NAME} plugin installed${NO_COLOR}"
    fi
}

function check_container_registry_plugin {
    echo -e "${BLUE_COLOR}Verify if ${CONTAINER_REGISTRY_PLUGIN_NAME} plugin is installed${NO_COLOR}"
    plugin=$(bx plugin list | grep ${CONTAINER_REGISTRY_PLUGIN_NAME} | wc -l )
    if [[ ${plugin} -eq 1 ]]; then
        echo -e "${GREEN_COLOR}${CONTAINER_REGISTRY_PLUGIN_NAME} plugin already installed. Updating...${NO_COLOR}"
        bx plugin update ${CONTAINER_REGISTRY_PLUGIN_NAME} -r Bluemix
        echo -e "${GREEN_COLOR}${CONTAINER_REGISTRY_PLUGIN_NAME} plugin updated${NO_COLOR}"
    else
        echo -e "${YELLOW_COLOR}${CONTAINER_REGISTRY_PLUGIN_NAME} plugin not installed. Installing...${NO_COLOR}"
        bx plugin install ${CONTAINER_REGISTRY_PLUGIN_NAME} -r Bluemix
        echo -e "${GREEN_COLOR}${CONTAINER_REGISTRY_PLUGIN_NAME} plugin installed${NO_COLOR}"
    fi
}

function install_kubectl {
    echo -e "${BLUE_COLOR}Check if kubectl is already installed...${NO_COLOR}"
    if ! kubectl help > /dev/null 2>&1; then
        echo -e "${YELLOW_COLOR}kubectl is not installed. Installing...${NO_COLOR}"
        curl -LO https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl
        chmod +x ./kubectl
        sudo mv ./kubectl /usr/local/bin/kubectl
        echo "${GREEN_COLOR}kubectl installed${NO_COLOR}"
    else
        echo "${GREEN_COLOR}kubectl already installed${NO_COLOR}"
    fi
}

function build_image {
    echo -n "${BLUE_COLOR}Which is version of \"nodejs-cloudant\" image you want to build?${NO_COLOR}"
    read VERSION
    echo -n "${BLUE_COLOR}Building \"registry.ng.bluemix.net/${NAMESPACE}/nodejs-cloudant:${VERSION}\"...${NO_COLOR}"
    docker build -t registry.ng.bluemix.net/${NAMESPACE}/nodejs-cloudant:${VERSION} .
    echo -n "${GREEN_COLOR}\"registry.ng.bluemix.net/${NAMESPACE}/nodejs-cloudant:${VERSION}\" built${NO_COLOR}"
    bx cr login
    CHECK=$(bx cr namespace-list | grep ${NAMESPACE} | wc -l)
    if [[${CHECK} -eq 0 ]; then
        bx cr namespace-add ${NAMESPACE}
    fi
    echo -n "${BLUE_COLOR}Pushing \"registry.ng.bluemix.net/${NAMESPACE}/nodejs-cloudant:${VERSION}\"...${NO_COLOR}"
    docker push registry.ng.bluemix.net/${NAMESPACE}/nodejs-cloudant:${VERSION}
    echo -n "${GREEN_COLOR}\"registry.ng.bluemix.net/${NAMESPACE}/nodejs-cloudant:${VERSION}\" pushed${NO_COLOR}"
}


function provision_kubernetes_via_helm {
    bx cf service-key ${CLOUDANT_SERVICE_INSTANCE} ${CLOUDANT_SERVICE_KEY} > tmpCredentialCloudant.json
    lines_to_ignore=$(grep -Fn -m1 '{' tmpCredentialCloudant.json | awk -F':' '{ print $1 }')
    export CLOUDANT_URL=$(tail -n +${lines_to_ignore} tmpCredentialCloudant.json | jq '.credentials.url' )

    substitute_variables_in_secret "../chart/nodejs-kubernetes-sample/templates/secret.json"
    helm upgrade -i --name "v${VERSION}" --set image.tag=${VERSION} ./chart/nodejs-kubernetes-sample/
}


set +e