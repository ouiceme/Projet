variable "vpc_cidr" {
  type = "string"
}

variable "subnet_cidr" {
  type = "list"
}

variable "region" {
  type = "string"
}

variable "s3bucket" {
  type = "string"
}

variable "keyterraform" {
  type    = "string"
  default = "webapp/terraform.tfstate"
}

variable az {
  type = "list"
}
variable ami_name {
  type = "string"
}
variable "keypub" {
  type        = "string"
  description = "SSH public key for EC2 access. Set via TF_VAR_keypub environment variable."
}

variable "ssh_cidr" {
  type        = "string"
  description = "CIDR block allowed to SSH into instances. Restrict to your IP range."
  default     = "10.0.0.0/8"
}
