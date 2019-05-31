var express = require("express");
var mysql = require('mysql');
var async = require('async');
var bodyParser = require('body-parser');
var multer = require('multer');
var fs = require('fs');

var storage = multer.diskStorage({
  destination: function(req,file,cb){
    cb(null, "./views/uploads");
  },
  filename: function(req,file,cb){
    cb(null, req.params.id + ".png");
  }
});

var upload = multer({storage: storage});

// DB
console.log('Get connection ...');
 
var conn = mysql.createConnection({
  database: 'test',
  host: "localhost",
  user: "root",
  password: "123456",
  port: 3306
});
 
conn.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

// Views
var app = express();
 
app.use(express.static("views"));
app.set("view engine", "ejs");
app.set("views", "./views");

app.listen(3000);

// app.get("/", function(request, response)  {
//   conn.query("SELECT * FROM tblbook", function(err, result, fields) {
//     if(err) throw err;
//     console.log("render");
//     response.render("homePage1",{data:result});
//   }); 
// });

//body-parser
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

// localStorage.setItem("user","-1");
var localUserId = "-1";

app.get("/", function(req, res)  {
  res.redirect("/1");
});


// Trang chu
app.get("/:page", function(req, res)  {
  var queryBook = "SELECT * FROM tblbook";
  var queryCate = "SELECT * FROM tblcategory";
  async.parallel([
    function(callback) { conn.query(queryBook, callback) },
    function(callback) { conn.query(queryCate, callback) }
  ], function(err, results) {
    res.render("homePage", { localUser: localUserId, pages : req.params.page , data : results[0][0], cate : results[1][0]});
  });
});


// Chi tiet sach
app.get("/books/:id", function(req,res){
  var queryBookById = "CALL getBook(\'" + req.params.id + "\')";
  var queryCate = "SELECT * FROM tblcategory";
  var queryCmt = "CALL getCmt(\'" + req.params.id + "\')";
  // conn.query(queryBookById, function(err,results, fields){
  //     if(err) throw err;
  //     console.log(results);
  // });
  async.parallel([
    function(callback) { conn.query(queryBookById, callback) },
    function(callback) { conn.query(queryCate, callback) },
    function(callback) { conn.query(queryCmt, callback) }
  ], function(err, results) {
    res.render("bookDetails", { data : results[0][0], cate : results[1][0], cmt : results[2][0] });
  });
});

// Dang nhap
app.get("/user/login",function(req,res){
  res.render("login");
});

app.post("/user/login",function(req,res){
  var userName = req.body.username;
  var password = req.body.password;
  var queryUser = "CALL authorUser(\'" + userName + "\',\'" + password + "\')";
  conn.query(queryUser, function(err, results, fields){
    if(err) throw err;
    if(results[0][0] == undefined) {
      res.redirect("/user/login");
    } else {
      localUserId = results[0][0].UserID;
      res.redirect("/");
    }
  });
});

// Dang xuat
app.get("/user/logout", function(req,res){
  // localStorage.clear();
  // localStorage.setItem("user","-1");
  localUserId = "-1";
  res.redirect("/");
});

// Dang ki
app.get("/user/signup",function(req,res){
  res.render("signup");
});

app.post("/user/signup",function(req,res){
  var su_userName = req.body.username;
  var su_password = req.body.password;
  var su_name = req.body.name;
  var su_email = req.body.email;
  var su_phonenumber = req.body.phonenumber;
  var su_address = req.body.address;
  var queryNewUser = "CALL newUser(\'" + su_userName + "\',\'" + su_password + "\',\'"
   + su_name + "\',\'" + su_email + "\',\'" + su_phonenumber + "\',\'" + su_address + "\')";
  conn.query(queryNewUser, function(err,results,fields){
    if(err) throw err;
    res.redirect("/user/login");
  })
});

// Info
app.get("/user/info",function(req,res){
  var queryInfoUser = "CALL getInfoUser(\'" + localUserId + "\')";
  conn.query(queryInfoUser,function(err,results,fields){
    if (err) throw err;
    res.render("info", {info : results[0][0], state: 2});
  });
});

app.post("/user/info",function(req,res){
  var state = 1;
  var prf_name = req.body.prf_fullName;
  var prf_phoneNumber = req.body.prf_phoneNumber;
  var prf_address = req.body.prf_address;
  var prf_currPassword = req.body.prf_currPassword;
  var prf_newPassword = req.body.prf_newPassword;  
  var queryInfoUser = "CALL getInfoUser(\'" + localUserId + "\')";
  if(req.body.prf_newPassword == req.body.prf_confPassword) {
    conn.query(queryInfoUser,function(err,results,fields){
      if (err) throw err;
      if(prf_currPassword == "" && prf_newPassword != "") state = 0; 
      if(prf_currPassword == "" && prf_newPassword == "") {
        prf_currPassword = results[0][0].Password;
        prf_newPassword = results[0][0].Password;
      }
      if(prf_newPassword == "") prf_newPassword = results[0][0].Password;
      if(prf_currPassword != results[0][0].Password) state = 0;

      if(state == 1){
        var queryUpdateInfo = "CALL updateInfo(\'" + localUserId + "\',\'" + prf_newPassword + "\',\'" + prf_name + "\',\'" + prf_phoneNumber + "\',\'" + prf_address + "\')";
        console.log(queryUpdateInfo);
        conn.query(queryUpdateInfo, function(err, results,fields){
          if(err) throw err;
        });
        conn.query(queryInfoUser,function(err, results, fields){
          if(err) throw err;
          res.render("info", {info : results[0][0], state : 1});
        });
      } else {
        conn.query(queryInfoUser,function(err, results, fields){
          if(err) throw err;
          res.render("info", {info : results[0][0], state : 0});
        });
      }
    });
  } else {
    conn.query(queryInfoUser,function(req,res){
      if(err) throw err;
      res.render("info", {info : results[0][0], state : 0});
    })
  }
});

//Gio hang
app.get("/user/cart",function(req,res){
  var queryCate = "SELECT * FROM tblcategory";
  conn.query(queryCate, function(err,results, fields){
      if(err) throw err;
      // console.log(results);
      res.render("cart", {cate: results }); 
  });
});

// The loai
app.get("/cate/:id/:page", function(req,res){
  var queryCateById = "CALL cateById" + "(\'" + req.params.id + "\')";
  var queryCate = "SELECT * FROM tblcategory";
  async.parallel([
    function(callback) { conn.query(queryCateById, callback) },
    function(callback) { conn.query(queryCate, callback) }
  ], function(err, results) {
    res.render("cate", { localUser: localUserId, cateId : req.params.id, pages : req.params.page, data : results[0][0], cate : results[1] });
  });
});

//Checkout
app.get("/user/checkout", function(req,res){
  if(!(localUserId == "-1")) {
    var queryInfoUser = "CALL getInfoUser(\'" + localUserId + "\')";
    conn.query(queryInfoUser,function(err,results){
      console.log(results[0][0].Address);
      res.render("checkout", {data: results[0][0]});    
    })
  } else res.render("checkout",{data: ""});
});

app.post("/user/checkout", function(req,res){
  var objs = JSON.parse(req.body.hiddenTag);
  var n = objs.length;
  console.log(n);
  var totalPrice = 0;
  for(var i=0;i<n;i++){
    totalPrice += parseInt(objs[i].price);
  }
  var queryNewTrans = "CALL newTrans (\'" + req.body.userId + "\',\'" + req.body.address + "\',\'" + 
    req.body.phoneNumber + "\',\'" + totalPrice + "\')";
  conn.query(queryNewTrans, function(err,result){
    var transId = result[0][0].lastId;
    console.log(transId);
    for(var i=0;i<n;i++){
      var queryNewCart = "CALL newCart (\'" + transId + "\',\'" + objs[i].bookId + "\',\'" + 
        objs[i].quantity + "\',\'" + objs[i].price + "\')";
        console.log(queryNewCart);
      conn.query(queryNewCart,function(err,results,fields){});
    }
  });
  res.render("orderSuccess");
});

//binh luan
app.post("/user/comment",function(req,res){
  console.log(req.body);
  if(req.body.userID == "-1") {
    res.redirect("/user/login");
  } else {
    var queryAddCmt = "CALL newComment (\'" + req.body.bookID + "\',\'" + req.body.userID + "\',\'" + req.body.commentField + "\')";
    conn.query(queryAddCmt,function(err,result){});
    res.redirect("/books/" + req.body.bookID);
  }
});

// Lich su
app.get("/user/history",function(req,res){
  var queryTrans = "CALL getTransByUser (\'" + localUserId + "\')";
  conn.query(queryTrans,function(err,results){
    if(err) throw err;
    console.log(results[0]);
    console.log(results);
    console.log(localUserId);
    res.render("history", {trans: results[0] });
  });
});

app.get("/user/history/:id", function(req,res){
  var transId = req.params.id;
  var queryCart = "CALL getCart(\'" + transId + "\')";
  conn.query(queryCart,function(err,results){
    if(err) throw err;
    console.log(results[0]);
    console.log(results[0][0]);
    res.render("historyDetail", {data: results[0]});
  });
});

//tim kiem
app.post("/search/:pages",function(req,res){
  var querySearch = "CALL searchBook(\'" + req.body.search + "\')";
  var queryCate = "SELECT * FROM tblcategory";
  async.parallel([
    function(callback) { conn.query(querySearch, callback) },
    function(callback) { conn.query(queryCate, callback) }
  ], function(err, results) {
    if(err) throw err;
    res.render("searchResults", { search: req.body.search, pages : req.params.pages , data : results[0][0][0], cate : results[1][0]});
  });
});

// ADMIN

var adminSession = 0;

// Dang nhap
app.get("/admin/login",function(req,res){
  res.render("admin/login");
});

app.post("/admin/login",function(req,res){
  var userName = req.body.username;
  var password = req.body.password;
  var queryAdmin = "select * from tbluser where UserID = 0";
  conn.query(queryAdmin, function(err, results, fields){
    if(err) throw err;
    if(results[0] == undefined) {
      res.redirect("/admin/login");
    } else {
      adminSession = 1;
      res.redirect("/admin/books/1");
    }
  });
});

// sach
app.get("/admin/books/:pages",function(req,res){
  if(adminSession == 0) res.redirect("/admin/login");
  else {
    var queryBook = "Select * from tblbook order by BookName ASC";
    conn.query(queryBook,function(err,results){
      if(err) throw err;
      // console.log(results[0]);
      res.render("admin/books",{pages: req.params.pages, data: results});
    });
  }
});

//sua sach
app.get("/admin/books/details/:id",function(req,res){
  if(adminSession == 0) res.redirect("/admin/login");
  else {
    var queryBookById = "CALL getBook(\'" + req.params.id + "\')";
    conn.query(queryBookById,function(err,results){
      if(err) throw err;
      var queryCate = "select * from tblcategory";
      conn.query(queryCate,function(err,result){
        res.render("admin/bookDetails",{data: results[0][0], cate: result});
      });
    });
  }
});

app.post("/admin/books/details/:id",upload.single("file") ,function(req,res){
  if(adminSession == 0) res.redirect("/admin/login");
  else {
    var queryUpdateBook = "CALL updateBook (\'" + req.params.id + "\',\'" + req.body.bookName + "\',\'" + req.body.author + "\',\'" + 
    req.body.describe + "\',\'" + req.body.price + "\',\'" + req.body.pagesNumber + "\',\'" + 
    req.body.rating + "\',\'" + req.body.company + "\',\'" + req.body.cateId + "\',\'" +  req.body.amount + "\')";
    conn.query(queryUpdateBook,function(err,results){
      if(err) throw err;
      res.redirect("/admin/books/details/"+req.params.id);
    })
  }
});

// xoa sach
app.post("/admin/books/remove/:id",function(req,res){
  if(adminSession == 0) res.redirect("/admin/login");
  else {
    var queryRemove = "DELETE FROM tblbook WHERE BookID = " + req.params.id;
    conn.query(queryRemove,function(err,results){
      if(err) throw err;
      res.redirect("/admin/books/"+req.body.pages);
    });
  }
});

// them sach
app.get("/admin/addbook/",function(req,res){
  if(adminSession == 0) res.redirect("/admin/login");
  else {
    var queryCate = "select * from tblcategory";
    conn.query(queryCate,function(err,result){
        res.render("admin/addBook",{cate: result});
    });
  }
});

app.post("/admin/addbook/",upload.single("file"),function(req,res){
  var queryNewBook = "CALL newBook (\'" + req.body.bookName + "\',\'" + req.body.author + "\',\'" + 
  req.body.describe + "\',\'" + req.body.price + "\',\'" + req.body.pagesNumber + "\',\'" + 
  req.body.rating + "\',\'" + req.body.company + "\',\'" + req.body.cateId + "\',\'" +  req.body.amount + "\')";
  conn.query(queryNewBook,function(err,results){
    console.log(queryNewBook);
    console.log(results);
    var tmp = "" + results[0][0].lastId;
    var n = tmp.length;
    var bookID = "";
    for(var i=1;i<=10-n;i++) bookID = bookID + "0";
    bookID = bookID + tmp + ".png";
    console.log(bookID);
    var path = "F:/Study/Ki 6 - BK/Nhập môn HQT CSDL/Project 2";
    fs.rename(path+"/views/uploads/undefined.png",path+"/views/uploads/"+bookID,function(err){
      if(err) throw err;
    })
  });
  res.redirect("/admin/addbook/");
});

// quan li ban hang
app.get("/admin/sale/",function(req,res){
  if(adminSession == 0) res.redirect("/admin/login");
  else {
    var StartDay = "2019-01-01";
    var EndDay = "2019-01-01";
    res.render("admin/sales",{data: "", pages: 1, startDay: StartDay, endDay: EndDay});
  }
});

app.post("/admin/sale/:pages",function(req,res){
  if(adminSession == 0) res.redirect("/admin/login");
  else {
    var start = req.body.startDay.split("-");
    var end = req.body.endDay.split("-");
    var querySale = "call saleManager(\'" + start[2] + "\',\'" + start[1] + "\',\'" + start[0] + "\',\'" + 
    end[2] + "\',\'" + end[1] + "\',\'" + end[0] + "\')";
    console.log(querySale);
    conn.query(querySale,function(err,results){
      if(err) throw err;
      res.render("admin/sales", {data: results[0], pages: req.params.pages, startDay: req.body.startDay, endDay: req.body.endDay});
    })
  }
})
