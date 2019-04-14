var qjobs = new require('qjobs');

// My non blocking main job
var myjob = function(args,next) {
    setTimeout(function() {
        console.log('Do something interesting here',args);
        next();

    },500);
}

var q = new qjobs({maxConcurrency:10});

q._add = (a,b)=>{
  q.add(a,b)
  if (q.jobsRunning === 0) {
    q.run()
  }
}

// Let's add 30 job to the queue
for (var i = 0; i<3; i++) {
    q._add(myjob,[i,'test '+i]);
}

q.on('start',function() {
    console.log('Starting ...');
});

q.on('end',function() {
    console.log('... All jobs done');
});

q.on('jobStart',function(args) {
    console.log('jobStart',args);
});

q.on('jobEnd',function(args) {

    console.log('jobend',args);

    // If i'm jobId 10, then make a pause of 5 sec

    if (args._jobId == 10) {
        q.pause(true);
        setTimeout(function() {
            q.pause(false);
        },5000);
    }
});

q.on('pause',function(since) {
    console.log('in pause since '+since+' milliseconds');
});

q.on('unpause',function() {
    console.log('pause end, continu ..');
});

q.run();
setTimeout(()=>{
  console.log('\n_add ben test');
  // console.log(q);
  q._add(myjob,[31,'BEN test 1']);
  // q.run()
  //

  setTimeout(()=>{
    console.log('\n_add ben test');
    // console.log(q);
    q._add(myjob,[32,'BEN test 2']);
    // q.run()
    //

    setTimeout(()=>{
      console.log('\n_add ben test');
      // console.log(q);
      q._add(myjob,[33,'BEN test 3']);
      // q.run()
    }, 500)
    setTimeout(()=>{
      console.log('\n_add ben test');
      // console.log(q);
      q._add(myjob,[34,'BEN test 4']);
    }, 500)
  }, 1000)
}, 2000)


//q.abort() will empty jobs list
