const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI)
  .then((data) => {
    console.log(`Mongoose Connected: ${data.connection.host}`);
  })
  .catch((err) => {
    console.error(err.message);
  })

  const UserSchema = Schema({
    username: {type: String, required: true}
  })

  const ExerciseSchema = Schema({
    user_id: {type: String, required: true},
    description: String,
    duration: Number,
    date: Date
  })

const User = mongoose.model('User', UserSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema);

let users = [];

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  let user = new User({
    username: req.body.username
  })

  user.save()
    .then((data) => {
      console.log(data);
      res.json(data);
    })
    .catch((err) => {
      console.error(err.message);
    });
})

app.post('/api/users/:_id/exercises', async(req, res) => {
  let user = await User.findById(req.params._id);
  let exercise = new Exercise({
    user_id: req.params._id,
    description: req.body.description,
    duration: req.body.duration,
  });

  if(!req.body.date){
    exercise.date = new Date();
  }else{
    exercise.date = req.body.date;
  }

  console.log(user);
  exercise.save()
    .then((data) => {
      console.log(data);
      res.json({
        username: user.username,
        description: data.description,
        duration: data.duration,
        date: data.date.toDateString(),
        _id: data.user_id
      });
    })
    .catch((err) => {
      console.error(err);
    })
})

app.get('/api/users', (req, res) => {
  User.find()
    .select('_id username')
    .exec()
      .then((data) => {
        console.log(data);
        users = data;
        res.json(data);
      })
      .catch((err) => {
        console.error(err);
      })    
})

app.get('/api/users/:_id/logs', async(req, res) => {
  try{
    const user = await User.findById(req.params._id).select("username -_id");

    const {from, to, limit } = req.query;

    let dateObj = {};

    if(user){
      if(from){
        dateObj["$gte"] = new Date(from);
      }
      if(to){
        dateObj["$lte"] = new Date(to);
      }

      let filter = {
        user_id: req.params._id
      }

      if(from || to){
        filter.date = dateObj;
      }

      const userLogs = await Exercise.find(filter).select("description duration date").limit(+limit ?? 500);

      const userObj = {
        username: user.username,
        count: userLogs.length,
        _id: req.params._id,
        log: userLogs.map((exercise) => ({
          description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
        }))
      }

      console.log(userObj);
      res.json(userObj);
    }
  }
  catch(err){
    console.error(err);
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
