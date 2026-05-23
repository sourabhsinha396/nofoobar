from sqladmin import ModelView

from app.db.models.organization import Organization


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
