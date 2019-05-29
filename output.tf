output "id_vpc" {
  value = "${aws_vpc.myvpc.id}"
}

output "id_subnet" {
  value = "${aws_subnet.first_sb.*.id}"
}

/* output "name_subnet" {
  value = "${aws_subnet.first_sb.*.tags["Name"]}"
}
*/
output "id_gw" {
  value = "${aws_internet_gateway.gw.id}"
}

output "id_routetable" {
  value = "${aws_route_table.r.id}"
}
