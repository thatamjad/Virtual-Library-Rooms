const mongoose = require('mongoose');
const UserSchema = require('./schemas/userSchema');
const OrganizationSchema = require('./schemas/organizationSchema');
const RoomSchema = require('./schemas/roomSchema');
const ReportSchema = require('./schemas/reportSchema');

// Compile models only if they haven't been compiled yet
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);

module.exports = {
  User,
  Organization,
  Room,
  Report
}; 