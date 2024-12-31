const { performance } = require('perf_hooks');

module.exports =  async({total, fn, args})=>{
    let failed = 0;
    let execTime = [];
    for(let i=total; i>1; i--){
        let startTime = performance.now();
        let d = await fn(args);
        console.log(JSON.stringify(d));
        if(d.error)failed++;
        let endTime = performance.now();
        let dif = Math.floor(endTime - startTime);
        execTime.push(dif);
        process.stdout.write('_');
    }
    console.log(execTime);
    console.log(`passed=`, execTime.length, `failed=`, failed)
}