# Projet — Infrastructure AWS avec Terraform & Packer

Déploiement automatisé d'une webapp sur AWS via un pipeline CI/CD Travis CI.

## Architecture

```
Travis CI (worker)
  └── Packer  → build AMI Ubuntu + Nginx
  └── Terraform (VPC module)  → VPC, subnets, IGW, route tables
  └── Terraform (webapp module) → Security Groups, Launch Config, ASG, ELB
```

- **Région AWS** : `eu-west-1`
- **VPC CIDR** : `10.1.0.0/16`
- **Subnets** : `10.1.1.0/24` (eu-west-1a), `10.1.10.0/24` (eu-west-1b)
- **Instance type** : `t2.micro`
- **Auto Scaling Group** : min/max 2 instances
- **Load Balancer** : ELB Classic, port 80

## Prérequis

- Compte AWS avec accès programmatique (clés `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)
- Bucket S3 `s3terraform44` et table DynamoDB `dbterraform` créés pour le state Terraform
- Variables d'environnement Travis CI configurées :
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `TF_VAR_keypub` — clé publique SSH pour les instances EC2
  - `TF_VAR_ssh_cidr` — CIDR autorisé pour SSH (ex: `203.0.113.0/24`)

## Pipeline CI/CD

Le pipeline se déclenche uniquement sur la branche `master` :

1. **install** — Installation de Terraform 0.11.15, Packer 1.8.6, Terragrunt 0.19.31 et awscli
2. **script (validation)** — `terraform fmt -check` et `terraform validate` sur les deux modules
3. **deploy** — `packer build` → extraction de l'AMI ID → `terraform init/plan/apply`

## Déploiement manuel

```bash
# 1. Build de l'AMI
cd packer
packer build webapp.json

# 2. Infrastructure VPC
cd ..
terraform init
terraform apply

# 3. Webapp
export TF_VAR_keypub="ssh-rsa AAAA..."
export TF_VAR_ssh_cidr="203.0.113.0/24"
cd webapp
terraform init -var ami_id=<AMI_ID>
terraform apply -var ami_id=<AMI_ID> -auto-approve
```

## Sécurité

- L'accès SSH est restreint via la variable `ssh_cidr` (défaut : `10.0.0.0/8`)
- La clé SSH publique doit être fournie via la variable d'environnement `TF_VAR_keypub` — ne pas la committer dans le code
- Le state Terraform est verrouillé via DynamoDB
