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
variable keypub {
  type    = "string"
  default = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDCR+axIfzYGqMea/ofb1NcZJHiKGk51Ih4RiS+iwClgRFm3JQUZedSwmgr0A1ZqWyWVdFicEU0iwQtYDliDLAKCKyapAEBWSemNugQGPFB/RUwHymi9qleahR+o60ShD32EvMMlz9abwRak0Kak3u2ohE99iBzB0vWV8eQQMHJVZJHfNthAlxl5VXV3DLrUYuQaDwt1S3AoP+8KWLeO3FVvu47dtD4NdQcEs9ruIRBRE99H49WvVHMwkMPNy21XuNxHyx4eS1iGvGPS30hQgAvg9d1K2M2iOcvbx7tJlNj2BYdNPlyCXZFdoQ+s/vqmismiJKiW8Hha+5GnyodEUc5 ext.formation@D2SIICE012"
}
