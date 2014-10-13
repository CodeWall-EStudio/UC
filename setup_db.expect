#!/usr/bin/expect

spawn mongo --host 127.0.0.1 --port 27017
expect "connecting to: 127.0.0.1:27017/test"
send "use usercenter\r"
expect "switched to db usercenter"
send "db.addUser('xzone_user', 'HeMHFxTAMPAjlRVH')\r"
expect "_id"
send "db.auth('xzone_user', 'HeMHFxTAMPAjlRVH')\r"
expect "1"
send "exit\r"
expect eof
