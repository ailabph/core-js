
const u = require("underscore");
class ailabCore{
    greet(firstName){
        if(!u.isString(firstName)){
            throw Error("firstName argument must be a string");
        }
        if(u.isEmpty(firstName)){
            return "hello stranger";
        }
        else{
            return "hello "+firstName;
        }
    }
}

module.exports = new ailabCore();