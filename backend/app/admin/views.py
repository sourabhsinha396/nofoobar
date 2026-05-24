from sqladmin import ModelView

from app.db.models.course import Course
from app.db.models.membership import UserOrgMembership
from app.db.models.organization import Organization
from app.db.models.user import User


class OrganizationAdmin(ModelView, model=Organization):
    column_list = [
        Organization.id,
        Organization.slug,
        Organization.name,
        Organization.custom_domain,
        Organization.created_at,
    ]
    column_searchable_list = [Organization.slug, Organization.name, Organization.custom_domain]
    column_sortable_list = [Organization.slug, Organization.name, Organization.created_at]
    form_columns = [
        Organization.slug,
        Organization.name,
        Organization.custom_domain,
        Organization.logo_url,
        Organization.primary_color,
        Organization.description,
    ]
    name = "Organization"
    name_plural = "Organizations"
    icon = "fa-solid fa-building"
    can_create = True
    can_edit = True
    can_delete = True


class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.email, User.name, User.created_at]
    column_searchable_list = [User.email, User.name]
    column_sortable_list = [User.email, User.name, User.created_at]
    form_columns = [User.name]
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    can_create = False
    can_edit = True
    can_delete = True


class UserOrgMembershipAdmin(ModelView, model=UserOrgMembership):
    column_list = [
        UserOrgMembership.id,
        UserOrgMembership.user_id,
        UserOrgMembership.org_id,
        UserOrgMembership.role,
        UserOrgMembership.created_at,
    ]
    column_sortable_list = [UserOrgMembership.role, UserOrgMembership.created_at]
    form_columns = [UserOrgMembership.user_id, UserOrgMembership.org_id, UserOrgMembership.role]
    name = "Membership"
    name_plural = "Memberships"
    icon = "fa-solid fa-user-group"
    can_create = True
    can_edit = True
    can_delete = True


class CourseAdmin(ModelView, model=Course):
    column_list = [Course.id, Course.slug, Course.title, Course.org_id, Course.created_at]
    column_searchable_list = [Course.slug, Course.title]
    column_sortable_list = [Course.slug, Course.title, Course.created_at]
    form_columns = [Course.org_id, Course.slug, Course.title, Course.description]
    name = "Course"
    name_plural = "Courses"
    icon = "fa-solid fa-graduation-cap"
    can_create = True
    can_edit = True
    can_delete = True
