# Node.js新闻网站

[TOC]

**核心需求**：

建立网站提供对爬取内容的分项全文搜索，给出所查关键词的时间热度分析

**代码实现GitHub：https://github.com/CheenYuee/Web-Project.git**



## 1 网站框架

网站后端使用**node.js express**框架；

网站前端引入了少量**bootstrap**组件；

### 1.1 Express 简介

Express 是一个简洁而灵活的 node.js Web应用框架, 提供了一系列强大特性和丰富的 HTTP 工具，使用 Express 可以快速地搭建一个完整功能的网站。

Express 框架核心特性：

- 可以设置中间件来响应 HTTP 请求。
- 定义了路由表用于执行不同的 HTTP 请求动作。
- 可以通过向模板传递参数来动态渲染 HTML 页面。

### 1.2 Express脚手架

Express脚手架是一个规范的项目模版。通过使用脚手架，我们能够快速并且规范地使用express框架服务。

Express脚手架目录如下：

- bin/：www文件所在文件目录，我们通过运行www文件启动Express；
- public/：通常用来存放浏览器拉取的公共资源，如图片等；
-  routes/：index.js所在文件目录，定义Express的响应路由；
- views：存放Express动态渲染的 HTML 页面，但在此文件后缀为.ejs，但作用与HTML 相同；

### 1.3 Bootstrap

Bootstrap 是一个用于快速开发 Web 应用程序和网站的前端框架，Bootstrap 包含了许多可重用的组件，用于创建图像、下拉菜单、导航、警告框、弹出框等等，能够帮助我们快速搭建Web前端网页。



## 2 Express网站后端

### 2.1 数据库查询

-  选择查找的 column；
- 选择要匹配like的关键词；
- 选择升序和降序；
- 选择LIMIT offset查找范围；

```javascript
const fetchSql = "select id_fetches,url,source_name,title,author,publish_date,summary as summary_ " +
        "from fetches where " + column + " like '%" + search + "%' order by publish_date desc LIMIT 10 " + 			"offset " + offset;
```

### 2.2 请求路由

```javascript
router.post('/process_post', function (request, response, next) {
    console.log(request.body)
    let search = request.body.search;
    const fetchSql = "select id_fetches,url,source_name,title,author,publish_date,summary as summary_ " +
        "from fetches where title like '%" + search + "%' order by publish_date desc LIMIT 10";
    mysql.query_noparam(fetchSql, async function (err, result, fields) {
        response.render('main', {column: "title", search: search, content: result});
    });
});
```

### 2.3 网页渲染

- 通过 response.render 可以渲染HTML页面；

- 控制语句<% ？？？ %>；
- 渲染语句<%= ？？？ %>；

```html
<ul>
    <% for(var i = 0;i < content.length;i++){ %>
        <li>
            <a href="/article?id=<%= content[i].id_fetches %>" class="contentBox" target="_blank">
                <strong><%= content[i].title %></strong>
                <p><%= content[i].summary_ %></p>
                <p><%= new Date(content[i].publish_date).toISOString().substring(0, 10) %></p>
            </a>
        </li>
    <% } %>
</ul>
```

## 3 网站前端

### 3.1 Bootstrap组件

**组件引入**

```html
<link rel="stylesheet" href="https://cdn.staticfile.org/twitter-bootstrap/3.3.7/css/bootstrap.min.css">
<script src="https://cdn.staticfile.org/jquery/2.1.1/jquery.min.js"></script>
<script src="https://cdn.staticfile.org/twitter-bootstrap/3.3.7/js/bootstrap.min.js"></script>
```

**导航栏**

```html
<ul class="nav navbar-nav navbar-right">
```

**下拉菜单**

```html
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">
        <strong>时间热度统计</strong>
        <b class="caret"></b>
    </a>
    <ul class="dropdown-menu">
       <li><a target="_blank" href="/wordCloud">词云图</a></li>
       <li class="divider"></li>
       <li><a target="_blank" href="/linChart?column=<%= column %>&search=<%= search %>">折线图</a></li>
       <li class="divider"></li>
       <li><a target="_blank" href="/bar?column=<%= column %>&search=<%= search %>">直方图</a></li>
       <li class="divider"></li>
       <li><a target="_blank" href="/pie?column=<%= column %>&search=<%= search %>">饼图</a></li>
     </ul>
</li>
```

**分页管理**

```html
<div class="pageControl">
   <ul class="pagination">
       <li class="page-item"><a class="page-link" href="/">Previous</a></li>
       <li class="page-item"><a class="page-link" href="/process_page?column=<%= column %>&page=1&search=<%= search %>">1</a></li>
       <li class="page-item"><a class="page-link" href="/process_page?column=<%= column %>&page=2&search=<%= search %>">2</a></li>
       <li class="page-item"><a class="page-link" href="/process_page?column=<%= column %>&page=3&search=<%= search %>">3</a></li>
       <li class="page-item"><a class="page-link" href="/">Next</a></li>
   </ul>
</div>
```

### 3.2 Echarts

使用Echarts绘制图表；

- 词云图（绘制词云图前，需要使用 node segment进行中文分词，并统计词频；）
- 折线图
- 直方图
- 饼图

```html
<!-- 为ECharts准备一个具备大小（宽高）的Dom -->
<div id="main" style="width: 1500px;height:700px;"></div>
```

**异步加载**

```html
<script type="text/javascript">
    // 基于准备好的dom，初始化echarts实例
    var myChart = echarts.init(document.getElementById('main'), 'dark');
    $.get("/get_data?column=<%= column %>&search=<%= search %>", function (data) {
        myChart.setOption({
            title: {
                text: '时间热度分析'
            },
            legend: {
                orient: 'vertical',
                left: 'right',
                data: JSON.parse(data).name
            },
            series: [
                {
                    name: '热度分析',
                    type: 'pie',
                    radius: '55%',
                    roseType: 'angle',
                    data: JSON.parse(data)
                }
            ]
        })
    });
</script>
```

**中文分词**

```javascript
router.get('/get_words_json', function (request, response) {
    const fetchSql = "select title,publish_date  from fetches order by publish_date desc LIMIT 1000";
    mysql.query_noparam(fetchSql, async function (err, result, fields) {
        // console.log(result)
        let Text = "";
        for (let i = 0; i < result.length; i++) {
            Text += result[i]['title'];
        }
        // 开始分词
        let words = segment.doSegment(Text, {stripPunctuation: true})
        // 统计词频
        let countResult = count(words)
        // console.log(countResult);
        response.write(JSON.stringify(countResult));
        response.end();
    });

    // response.render('wordCloud');
});
```

**统计词频**

```javascript
function count(words) {
    let map = new Map();
    let keys = [];
    for (let i = 0; i < words.length; i++) {
        let word = words[i]
        if (map.has(word['w'])) {  // 如果有该key值
            map.set(word['w'], map.get(word['w']) + 1);
        } else {
            map.set(word['w'], 1);   // 如果没有该key值
            keys.push(word['w']);
        }
    }
    // console.log(keys)
    let result = [];
    for (let i = 0; i < keys.length; i++) {
        result.push({name: keys[i], value: map.get(keys[i])});
    }
    return result;
}
```

## 4 学习总结

在本次Project中，主要使用node.js进行实现。node.js中的express是一个使用非常方便的后端框架，并且express提供的脚手架已经能够被直接访问了，我们只需要添加新的路由信息和相应的处理函数即可快速搭建一个简单的Web网站。