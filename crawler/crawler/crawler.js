const myRequest = require('request');
const myCheerio = require('cheerio');
const myIconv = require('iconv-lite');
const schedule = require('node-schedule');
require('date-utils');
const mysql = require('../database/mysql');
const chardet = require('jschardet');
// ------------------------------------------------------------------------------------------
// const source_name = "中国新闻网";
// let myEncoding = "UTF-8";
// const seedURL = 'http://www.chinanews.com/';
// const seedURL_format = "$('a')";
// const keywords_format = " $('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
// const title_format = "$('title').text()";
// const date_format = "$('#pubtime_baidu').text()";
// const author_format = "$('#editor_baidu').text()";
// const content_format = "$('.left_zw').text()";
// const desc_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
// const source_format = "$('#source_baidu').text()";
// const url_reg = /\/(\d{4})\/(\d{2})-(\d{2})\/(\d{7}).shtml/;
// // 标准网址https://www.chinanews.com.cn/mil/2022/07-08/9798599.shtml
// const regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/;
// ------------------------------------------------------------------------------------------
const source_name = "搜狐新闻";
let myEncoding = "UTF-8";
const seedURL = 'http://news.sohu.com/';
const seedURL_format = "$('a')";
const keywords_format = "$('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
const title_format = "$('title').text()";
const date_format = "$('meta[property=\"og:release_date\"]').eq(0).attr(\"content\")";
const author_format = "$('meta[name=\"mediaid\"]').eq(0).attr(\"content\")";
const content_format = "$('.article').text()";
const desc_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
const source_format = "$('meta[name=\"mediaid\"]').eq(0).attr(\"content\")";
const url_reg = /\/a\/(\d{9})\_/;
const regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/;
// ------------------------------------------------------------------------------------------
// const source_name = "新浪网新闻中心";
// let myEncoding = "UTF-8";
// const seedURL = 'https://news.sina.com.cn/';
// const seedURL_format = "$('a')";
// const keywords_format = "$('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
// const title_format = "$('title').text()";
// const date_format = "$('meta[property=\"article:published_time\"]').eq(0).attr(\"content\")";
// const author_format = "$('meta[name=\"mediaid\"]').eq(0).attr(\"content\")";
// const content_format = "$('.article').text()";
// const desc_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
// const source_format = "$('meta[name=\"mediaid\"]').eq(0).attr(\"content\")";
// const url_reg = /\/.+\/\d{4}-\d{2}-\d{2}\/.+[.]shtml/;
// // 标准网址https://news.sina.com.cn/gov/xlxw/2022-07-08/doc-imizirav2474084.shtml
// const regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/;
// ------------------------------------------------------------------------------------------
// const source_name = "网易新闻";
// let myEncoding = "UTF-8";
// const seedURL = 'https://news.163.com/';
// const seedURL_format = "$('a')";
// const keywords_format = "$('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
// const title_format = " $('meta[property=\"og:title\"]').eq(0).attr(\"content\")";
// const date_format = "$('meta[property=\"article:published_time\"]').eq(0).attr(\"content\")";
// const author_format = "$('meta[name=\"author\"]').eq(0).attr(\"content\")";
// const content_format = "$('.post_body').text()";
// const desc_format = "$('meta[name=\"description\"]').eq(0).attr(\"content\")";
// const source_format = "$('meta[name=\"author\"]').eq(0).attr(\"content\")";
// const url_reg =/\/(\d{2})\/(\d{4})\/(\d{2})\/(\w{10,30}).html/;
// const regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/;
// ------------------------------------------------------------------------------------------

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

function newsGet(myURL) { //读取新闻页面
    request(myURL, function (err, res, body) {
        // 选择编码
        if (seedURL === 'https://news.sina.com.cn/') myEncoding = chardet.detect(body)['encoding'];

        //用iconv转换编码
        const html_news = myIconv.decode(body, myEncoding);
        //用cheerio解析html_news
        const $ = myCheerio.load(html_news, {decodeEntities: true});
        console.log("转码读取成功:" + myURL);
        // console.log('----'+myURL);
        // console.log('----'+eval(title_format));

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