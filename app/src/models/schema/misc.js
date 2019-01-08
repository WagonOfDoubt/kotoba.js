// this is generic kusaba database tables

const banlistSchema = Schema({
  type:        Number,
  allowread:   Boolean,
  ip:          String,
  ipmd5:       String,
  globalban:   Boolean,
  boards:      [Schema.Types.ObjectId],
  by:          Schema.Types.ObjectId,
  at:          Date,
  until:       Date,
  reason:      String,
  appealat:    Date
});

const bannedSchema = Schema({
  md5:         String,
  bantime:     Date,
  description: String
});

const blotterSchema = Schema({
  important:   Boolean,
  at:          Date,
  message:     String
});

const filetypesSchema = Schema({
  filetype:     String,
  mime:         String,
  image:        String,
  image_w:      Number,
  image_h:      Number,
  force_thumb:  Boolean
});

const loginattemptsSchema = Schema({
  ip:           String,
  timestamp:    Date,
  useragent:    String
});

const modlogSchema = Schema({
  entry:        String,
  user:         String,
  category:     Number,
  timestamp:    Date
});

const newsSchema = Schema({
  subject:      String,
  message:      String,
  postedat:     Date,
  postedby:     String,
  postedemail:  String
});

const reportsSchema = Schema({
  cleared:      Boolean,
  board:        Schema.Types.ObjectId,
  postid:       Schema.Types.ObjectId,
  when:         Date,
  ip:           String
});

const sectionsSchema = Schema({
  order:        Number,
  hidden:       Boolean,
  name:         String,
  abbreviation: String
});

const staffSchema = Schema({
  username:     String,
  password:     String,
  boards:       [Schema.Types.ObjectId],
  addedon:      Date,
  lastactive:   Date
});

const wordfilterSchema = Schema({
  word:         String,
  replacedby:   String,
  boards:       [Schema.Types.ObjectId],
  time:         Date,
  regex:        String
});
