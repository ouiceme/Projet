/* output "ip_ec2" {
  value = "${aws_instance.web.public_ip}"
} */

/* output "elbdns" {
  value = "${aws_instance.myelb.dns_name}"
} */
/* output "ip_instance" {
  value = "${aws_elb.myconfig.public_ip}"
} */

output "elbdns" {
  value = "${aws_elb.myelb.dns_name}"
}


