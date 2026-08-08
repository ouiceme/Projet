#!/bin/sh
set -e

# Build AMI with Packer
cd $TRAVIS_BUILD_DIR/packer
packer build -machine-readable webapp.json | tee /tmp/packer.out

# Extract AMI ID from machine-readable output (artifact,0,id field)
AMI=$(grep 'artifact,0,id' /tmp/packer.out | cut -d, -f6 | cut -d: -f2)

if [ -z "$AMI" ]; then
  echo "ERROR: Could not extract AMI ID from packer output" >&2
  exit 1
fi

echo "Built AMI: $AMI"

# Deploy infrastructure with Terraform
cd $TRAVIS_BUILD_DIR/webapp
terraform init -var ami_id=$AMI
terraform plan -var ami_id=$AMI -out=tfplan
terraform apply -auto-approve tfplan
