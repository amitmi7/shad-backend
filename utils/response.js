const generateTimestampWithOffset = require('./unixtime')
// Oops, there was a hiccup.
function response(statuscode = 404, successBool = false,  message = "We hit a snag. Hang tight and try again.", dataValue = null) {
    return {
        success: successBool,
        status: statuscode,
        msg: message,
        epoch:generateTimestampWithOffset(),
        data: dataValue
    }
}
module.exports = response