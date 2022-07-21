# Node.js网络爬虫

[TOC]

**核心需求**：

选取3-5个代表性的新闻网站（比如新浪新闻、网易新闻等，或者某个垂直领域权威性的网站比如经济领域的雪球财经、东方财富等，或者体育领域的腾讯体育、虎扑体育等等）建立爬虫，针对不同网站的新闻页面进行分析，爬取出编码、标题、作者、时间、关键词、摘要、内容、来源等结构化信息，存储在数据库中。

**代码实现GitHub：https://github.com/CheenYuee/Web-Project.git**



## 1 分析html页面

爬取的新闻网站：

- 中国新闻网
- 搜狐新闻
- 新浪新闻中心
- 网易新闻

**现以中国新闻网为例进行介绍；**

### 1.1 分析种子页面

在种子页面，我们需要爬取的就是新闻网页链接地址，供我们之后爬取新闻内容使用。网页链接一般在<a></a>标签内。

中国新闻网某新闻链接样例：

```html
<div class="bold multi">
    <a href="https://www.chinanews.com.cn/gn/2022/07-20/9807462.shtml" class="zw" data-did="9807462" data-doctype="zw" target="_blank">本土新增108+827例</a>
    <a href="https://www.chinanews.com.cn/sh/2022/07-20/9807423.shtml" class="zw" data-did="9807423" data-doctype="zw" target="_blank">北京新增1例本土确诊</a>
</div>
```

### 1.2 分析内容页面

在内容页面，我们需要爬取的就是新闻具体内容，内容包括 title、author、keywords等。因为不同的内容位于不同的标签内，并且有不同的name，在之后我们要根据我们所需要爬取的内容，使用选择器选择我们要爬取的元素。

> Cheerio是一个Node.js的模块库， 它可以从html的片断中构建DOM结构，然后提供像jquery一样的css选择器查询

常用的选择器如下：

-   元素选择器：$('title')
- 类选择器： $('.class')
- id选择器： $('#author’)
- 属性选择器：$('meta[name="author"]')

中国新闻网某新闻网页内容样例：

```html
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>中国新闻网_梳理天下新闻</title>
<meta name="author" content="chinanews">
<meta name="copyright" content="www.chinanews.com,版权所有"> 
<meta name="keywords" content="中国新闻网,中新网,新闻,时事,时政,国际,国内,社会,法治,聚焦,评论,文化,教育,新视点,深度,网评,专题,环球,传播,论坛,图片,军事,焦点,排行,环保,校园,法治,奇闻,真情">
<meta name="description" content="中国新闻网，是知名的中文新闻门户网站，也是全球互联网中文新闻资讯最重要的原创内容供应商之一。依托中新社遍布全球的采编网络,每天24小时面向广大网民和网络媒体，快速、准确地提供文字、图片、视频等多样化的资讯服务。在新闻报道方面，中新网动态新闻及时准确，解释性报道角度独特，稿件被国内外网络媒体大量转载。"> 
</head>
```



## 2 编写爬虫代码

**相关依赖可以使用以下命令进行安装；**

```shell
npm install ×××
```

**依赖库：**

```javascript
require('request');
require('cheerio');
require('iconv-lite');
require('node-schedule');
require('date-utils');
require('mysql');
require('jschardet');
```

### 2.1 初始化数据库

通过node.js连接mysql数据库：

```javascript
const mysql = require("mysql");
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '你的密码',
    database: 'crawl'
});
```

封装的访问模块：

```javascript
const query_noparam = function (sql, callback) {
    pool.getConnection(function (err, conn) {
        if (err) {
            callback(err, null, null);
        } else {
            conn.query(sql, function (qerr, vals, fields) {
                conn.release(); //释放连接
                callback(qerr, vals, fields); //事件驱动回调
            });
        }
    });
};
```

**初始化mysql数据库：**

我封装了一个数据库初始化模块：

- 查询fetches表是否已经存在，若存在则DROP该表；
- 创建fetches表；

```javascript
const mysql = require("./mysql");
const drop_table = 'DROP TABLE fetches';
mysql.query_noparam(drop_table, function (qerr, vals, fields) {
    if (qerr) {
        // 表不存在
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
```

### 2.2 构建访问模块

```javascript
//防止网站屏蔽我们的爬虫
const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
};

//request模块异步fetch url
function request(url, callback) {
    const options = {
        url: url,
        encoding: null,
        //proxy: 'http://x.x.x.x:8080',
        headers: headers,
        timeout: 10000 //
    };
    myRequest(options, callback)
}
```

### 2.3 爬取种子页面

在爬取种子页面时，本质上就是爬取新闻网页链接地址。

重要的几点如下：

- 使用**seedURL_format = "$('a')"**选择所有的链接地址；

- 检验新闻链接是否符合新闻URL的**正则表达式**，即判断改链接是否是一个有效的新闻地址(有可能出现404页面)；

  例如一个标准的新闻网址 https://www.chinanews.com.cn/mil/2022/07-08/9798599.shtml

- 值得注意的是，**链接有些是http，有些是https**，需要分类处理；

- 对每个有效的链接发起request；

```javascript
function seedget() {
    //读取种子页面
    request(seedURL, function (err, res, body) {
        //用iconv转换编码
        const html = myIconv.decode(body, myEncoding);
        //用cheerio解析html
        const $ = myCheerio.load(html, {decodeEntities: true});
        let seedurl_news;
        try {
            seedurl_news = eval(seedURL_format);
        } catch (e) {
            console.log('url列表所处的html块识别出错：' + e)
            return;
        }
        seedurl_news.each(function (i, e) { //遍历种子页面里所有的a链接
            let myURL = "";
            try {
                //得到具体新闻url
                let href;
                href = $(e).attr("href");
                if (href === undefined) return;
                if (href.toLowerCase().indexOf('http://') >= 0) myURL = href; //http://开头的
                else if (href.toLowerCase().indexOf('https://') >= 0) myURL = href; //http://开头的
                else if (href.startsWith('//')) myURL = 'http:' + href; ////开头的
                else myURL = seedURL.substr(0, seedURL.lastIndexOf('/') + 1) + href; //其他
            } catch (e) {
                console.log('识别种子页面中的新闻链接出错：' + e)
            }
            //检验是否符合新闻url的正则表达式
            if (!url_reg.test(myURL)) return;
            const fetch_url_Sql = 'select url from fetches where url=?';
            const fetch_url_Sql_Params = [myURL];
            mysql.query(fetch_url_Sql, fetch_url_Sql_Params, function (qerr, vals, fields) {
                if (vals.length > 0) {
                    //console.log('URL duplicate!')
                } else newsGet(myURL); //读取新闻页面
            });
        });
    });
}
```

**定时执行**

```javascript
// 首次执行
seedget();
// 定时再次执行
const rule = new schedule.RecurrenceRule();
const times = [0, 12]; //每天2次自动执行
const times2 = 5; //定义在第几分钟执行
rule.hour = times;
rule.minute = times2;
schedule.scheduleJob(rule, function () {
    seedget();
});
```



### 2.4 爬取内容页面

**爬取中国新闻网需要用到的匹配format，通过选择器，我们可以选择我们想要获取的元素内容**

常用的选择器如下：

- 元素选择器
- 类选择器
- id选择器

```javascript
const source_name = "中国新闻网";
let myEncoding = "UTF-8";
const seedURL = 'http://www.chinanews.com/';
const seedURL_format = "$('a')";
const keywords_format = " $('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
const title_format = "$('title').text()";
const date_format = "$('#pubtime_baidu').text()";
const author_format = "$('#editor_baidu').text()";
const content_format = "$('.left_zw').text()";
const desc_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
const source_format = "$('#source_baidu').text()";
const url_reg = /\/(\d{4})\/(\d{2})-(\d{2})\/(\d{7}).shtml/;
// 标准网址https://www.chinanews.com.cn/mil/2022/07-08/9798599.shtml
const regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/;
```

**newsGet函数**

该函数的作用为读取某一个有效URL的新闻内容，也是代码的核心部分。主要作用如下：

- 用iconv转换编码
- 用cheerio解析html_news
- 判断是否是有效页面
- 通过选择器，读取元素内容
- 匹配日期格式
- 判断改页面是否已经被爬取过（查询数据库，判断数据库中是否已经存在）；
- 写入数据库

在转换编码时，我们需要选择使用的编码，在node.js中，我们可以使用jschardet探测**网页编码**，但探测结果不一定准确，我们可以直接在浏览器的console中输入以下命令返回网页的编码。

```shell
document.charset
```

```javascript
function newsGet(myURL) { //读取新闻页面
    request(myURL, function (err, res, body) {
        // 选择编码
        if (seedURL === 'https://news.sina.com.cn/') myEncoding = chardet.detect(body)['encoding'];
        //用iconv转换编码
        const html_news = myIconv.decode(body, myEncoding);
        //用cheerio解析html_news
        const $ = myCheerio.load(html_news, {decodeEntities: true});
        console.log("转码读取成功:" + myURL);
        // 判断是否是有效页面
        if (eval(title_format) === '中国新闻网-404页面') return;
        if (eval(title_format) === ' 页面没有找到 ') return;
        if (eval(keywords_format) === '404missing') return;
        //动态执行format字符串，构建json对象准备写入文件或数据库
        var fetch = {};
        fetch.url = myURL;
        fetch.source_name = source_name;
        fetch.source_encoding = myEncoding;
        fetch.keywords = eval(keywords_format);
        fetch.title = eval(title_format);
        fetch.author = eval(author_format);
        fetch.source = eval(source_format);
        fetch.summary = eval(desc_format);
        fetch.content = eval(content_format);
        //清洗content
        if (fetch.content) fetch.content = fetch.content.replace(fetch.author, "");
        if (fetch.content) fetch.content = fetch.content.replace(/(^\s*)|(\s*$)/g, ""); // 去除头尾空格
        while (fetch.content && fetch.content.search('\n') !== -1) {
            fetch.content = fetch.content.replace("\n", "");
        }
        fetch.crawltime = new Date();
        fetch.publish_date = (new Date()).toFormat("YYYY-MM-DD");
        fetch.publish_date = eval(date_format); //刊登日期
        //在一个指定的字符串中执行模式匹配。如果匹配成功，返回数组；否则返回null
        const tmp = regExp.exec(fetch.publish_date);
        if (tmp) {
            fetch.publish_date = tmp[0];
            fetch.publish_date = fetch.publish_date.replace('年', '-')
            fetch.publish_date = fetch.publish_date.replace('月', '-')
            fetch.publish_date = fetch.publish_date.replace('日', '')
            fetch.publish_date = new Date(fetch.publish_date).toFormat("YYYY-MM-DD");
        } else {
            fetch.publish_date = null;
        }
        //写入数据库
        const fetchAddSql = 'INSERT INTO fetches(url,source_name,source_encoding,title, ' +
            'keywords,author,source,publish_date,crawltime,summary,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)';
        const fetchAddSql_Params = [fetch.url, fetch.source_name, fetch.source_encoding,
            fetch.title, fetch.keywords, fetch.author, fetch.source, fetch.publish_date,
            fetch.crawltime.toFormat("YYYY-MM-DD HH24:MI:SS"), fetch.summary, fetch.content
        ];
        //执行sql，数据库中fetch表里的url属性是unique的，不会把重复的url内容写入数据库
        mysql.query(fetchAddSql, fetchAddSql_Params, function (qerr, vals, fields) {
            if (qerr) {
                // 插入异常
                console.log(qerr);
            }
        });
    });
}
```

## 3 学习总结

在爬取不同的新闻页面时，代码的框架能够直接复用，但我们需要根据不同页面的实际情况，分析种子页面和新闻页面，使用选择器选择我们想要读取的html标签，从而获取内容。
