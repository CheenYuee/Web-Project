const mysql = require("./mysql");

const drop_table = 'DROP TABLE fetches';
mysql.query_noparam(drop_table, function (qerr, vals, fields) {
    if (qerr) {
        // 表不存在
        // console.log(qerr);
    }
});


const creat_table = 'CREATE TABLE `fetches` ( \
    `id_fetches` int(11)  NOT NULL AUTO_INCREMENT, \
    `url` varchar(200) DEFAULT NULL, \
    `source_name` varchar(200) DEFAULT NULL, \
    `source_encoding` varchar(45) DEFAULT NULL, \
    `title` varchar(200) DEFAULT NULL, \
    `keywords` varchar(200) DEFAULT NULL, \
    `author` varchar(200) DEFAULT NULL, \
    `source` varchar(200) DEFAULT NULL, \
    `publish_date` date DEFAULT NULL, \
    `crawltime` datetime DEFAULT NULL, \
    `summary` longtext, \
    `content` longtext, \
    `createtime` datetime DEFAULT CURRENT_TIMESTAMP, \
    PRIMARY KEY (`id_fetches`), \
    UNIQUE KEY `id_fetches_UNIQUE` (`id_fetches`), \
    UNIQUE KEY `url_UNIQUE` (`url`) \
) ENGINE=InnoDB DEFAULT CHARSET=utf8;';

mysql.query_noparam(creat_table, function (qerr, vals, fields) {
    if (qerr) {
        console.log(qerr);
    }
});

