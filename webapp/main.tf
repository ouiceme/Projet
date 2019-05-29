provider "aws" {
  region  = "${var.region}"
  version = "~> 2.0"
}

terraform {
  backend "s3" {
    bucket         = "s3terraform44"
    key            = "webapp/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "dbterraform"
  }
}

data "terraform_remote_state" "mainvpc" {
  backend = "s3"

  config {
    bucket = "s3terraform44"
    key    = "vpc/terraform.tfstate"
    region = "eu-west-1"
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"]
  }

  owners = ["099720109477"] # Canonical id developper }
}

data "template_file" "YYYY" {
  template = "${file("${path.module}/userdata.tpl")}"

  vars {
    username = "..."
  }
}

resource "aws_security_group" "allow_all" {
  name        = "allow_all"
  description = "Allow all inbound traffic"
  vpc_id      = "${data.terraform_remote_state.mainvpc.id_vpc}"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_key_pair" "mykey" {
  key_name   = "mykey"
  public_key = "${var.keypub}"
}

/*resource "aws_instance" "web" {
  ami                         = "${data.aws_ami.ubuntu.id}"
  instance_type               = "t2.micro"
  key_name                    = "${aws_key_pair.mykey.key_name}"
  vpc_security_group_ids      = ["${aws_security_group.allow_all.id}"]
  user_data                   = "${data.template_file.YYYY.rendered}"
  subnet_id                   = "${data.terraform_remote_state.mainvpc.id_subnet[0]}"
  associate_public_ip_address = 1

  tags {
    Name = "HelloWorld"
  }
}*/

resource "aws_launch_configuration" "myconfig" {
  name_prefix     = "YYYY"
  image_id        = "${data.aws_ami.ubuntu.id}"
  instance_type   = "t2.micro"
  security_groups = ["${aws_security_group.allow_all.id}"]
  //key_name        = "${aws_key_pair.mykey.key_name}"
  user_data       = "${data.template_file.YYYY.rendered}"
  associate_public_ip_address = 1


  lifecycle {
    create_before_destroy = "true"
  }
}

resource "aws_autoscaling_group" "myauto" {
  vpc_zone_identifier = ["${data.terraform_remote_state.mainvpc.id_subnet[0]}", "${data.terraform_remote_state.mainvpc.id_subnet[1]}"]
  name = "asg-${aws_launch_configuration.myconfig.name}"
  max_size = 2
  min_size = 2
  health_check_grace_period = 300
  health_check_type = "EC2"
  launch_configuration = "${aws_launch_configuration.myconfig.name}"
  load_balancers = ["${aws_elb.myelb.id}"]

  tags = [{
    key                 = "Name"             # vpc_zone_identifier : subnet_ids   vpc_zone_identifier            = ["${data.terraform_remote_state.XXXX.YYYY[0]}","${data.terraform_remote_state.XXXX.YYYY}[1]"]  name                                = "asg-${aws_launch_configuration.YYYY.name}"  max_size                           = 2  min_size                            = 2  health_check_grace_period = 300  health_check_type             = "EC2"  launch_configuration          = "${aws_launch_configuration.XXXX.name}"  load_balancers                  = ["${aws_elb.XXXX.id}"]
    value               = "autoscaledserver"
    propagate_at_launch = true
  }]

  lifecycle {
    create_before_destroy = "true"
  }
}

resource "aws_elb" "myelb" {
  name            = "web-elb"
  subnets         = ["${data.terraform_remote_state.mainvpc.id_subnet[0]}", "${data.terraform_remote_state.mainvpc.id_subnet[1]}"]
  security_groups = ["${aws_security_group.allow_all.id}"]

  ## Loadbalancer configuration
  listener {
    instance_port     = 80
    instance_protocol = "http"
    lb_port           = 80
    lb_protocol       = "http"
  }

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 2
    target              = "HTTP:80/"
    interval            = 5
  }
}
