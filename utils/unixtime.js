function generateTimestampWithOffset() {

  const currentTimestamp = Date.now();
  const unixTimestamp = Math.floor(currentTimestamp / 1000); 
  return unixTimestamp;
}

module.exports = generateTimestampWithOffset;