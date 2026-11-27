import { CreateUsersTable1700000000000 } from './1700000000000-CreateUsersTable';
import { AddBioToUsersTable1700000000001 } from './1700000000001-AddBioToUsersTable';
import { CreateFollowsTable1700000000002 } from './1700000000002-CreateFollowsTable';
import { CreateAttachmentsTable1700000000003 } from './1700000000003-CreateAttachmentsTable';
import { AddUniqueConstraintToUsersUsername1700000000004 } from './1700000000004-AddUniqueConstraintToUsersUsername';
import { CreateArticlesTables1700000000005 } from './1700000000005-CreateArticlesTables';
import { CreateCommentsTable1700000000006 } from './1700000000006-CreateCommentsTable';

export const DATABASE_MIGRATIONS = [
  CreateUsersTable1700000000000,
  AddBioToUsersTable1700000000001,
  CreateFollowsTable1700000000002,
  CreateAttachmentsTable1700000000003,
  AddUniqueConstraintToUsersUsername1700000000004,
  CreateArticlesTables1700000000005,
  CreateCommentsTable1700000000006,
];

