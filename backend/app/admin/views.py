from sqladmin import ModelView

from app.db.models.organization import Organization
from app.db.models.user import User


class OrganizationAdmin(ModelView, model=Organization):
    column_list = [Organization.id, Organization.slug, Organization.name, Organization.created_at]
    column_searchable_list = [Organization.slug, Organization.name]
    column_sortable_list = [Organization.slug, Organization.name, Organization.created_at]
    form_columns = [
        Organization.slug,
        Organization.name,
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
