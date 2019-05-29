#!/bin/bash
set -e

PACKER_VERSION=1.0.4
TERRAFORM_VERSION=0.10.2
TERRAGRUNT_VERSION=0.13.0

TOOLS_DIR=$1
mkdir -p ${TOOLS_DIR}
BIN_DIR=${TOOLS_DIR}/bin
mkdir -p ${BIN_DIR}
export PATH=${BIN_DIR}:$PATH

### Install Terraform
TERRAFORM_DL=${TOOLS_DIR}/terraform-${TERRAFORM_VERSION}
if [ ! -d "${TERRAFORM_DL}" ]
then
    mkdir -p ${TERRAFORM_DL}
    wget -q -O terraform-${TERRAFORM_VERSION}.zip https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
    unzip -q terraform-${TERRAFORM_VERSION}.zip -d ${TERRAFORM_DL}
    rm terraform-${TERRAFORM_VERSION}.zip
fi
ln -sf ${TERRAFORM_DL}/terraform ${BIN_DIR}
terraform version

### Install Terragrunt
TERRAGRUNT_DL=${TOOLS_DIR}/terragrunt-${TERRAGRUNT_VERSION}
if [ ! -d "${TERRAGRUNT_DL}" ]
then
    mkdir -p ${TERRAGRUNT_DL}
    wget -q -O ${TERRAGRUNT_DL}/terragrunt https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64
    chmod +x ${TERRAGRUNT_DL}/terragrunt
fi
ln -sf ${TERRAGRUNT_DL}/terragrunt ${BIN_DIR}
terragrunt --version


### Install packer
PACKER_DL=${TOOLS_DIR}/packer-${PACKER_VERSION}
if [ ! -d "${PACKER_DL}" ]
then
    mkdir -p ${PACKER_DL}
    wget -q -O packer-${PACKER_VERSION}.zip https://releases.hashicorp.com/packer/${PACKER_VERSION}/packer_${PACKER_VERSION}_linux_amd64.zip
    unzip -q packer-${PACKER_VERSION}.zip -d ${PACKER_DL}
    rm packer-${PACKER_VERSION}.zip
fi

ln -sf ${PACKER_DL}/packer ${BIN_DIR}
packer version

exit 0
