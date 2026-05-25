from sqladmin import ModelView

from app.db.models.course import Course
from app.db.models.enrollment import Enrollment
from app.db.models.lesson import Lesson
from app.db.models.membership import UserOrgMembership
from app.db.models.organization import Organization
from app.db.models.payment_account import OrgPaymentAccount
from app.db.models.payment_attempt import PaymentAttempt
from app.db.models.section import Section
from app.db.models.user import User


class OrganizationAdmin(ModelView, model=Organization):
    column_list = [
        Organization.id,
        Organization.slug,
        Organization.name,
        Organization.custom_domain,
        Organization.created_at,
    ]
    column_searchable_list = [
        Organization.slug,
        Organization.name,
        Organization.custom_domain,
    ]
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


class OrgPaymentAccountAdmin(ModelView, model=OrgPaymentAccount):
    # secret_key is intentionally NOT in column_list or form_columns — it's
    # encrypted bytes and should never be exposed through sqladmin (decrypting
    # it would defeat the at-rest encryption).
    column_list = [
        OrgPaymentAccount.id,
        OrgPaymentAccount.org_id,
        OrgPaymentAccount.provider,
        OrgPaymentAccount.key_id,
        OrgPaymentAccount.created_at,
    ]
    column_searchable_list = [OrgPaymentAccount.key_id]
    column_sortable_list = [
        OrgPaymentAccount.provider,
        OrgPaymentAccount.created_at,
    ]
    # No form_columns set → sqladmin disables editing. Tenants manage their
    # own credentials via the admin UI; superadmin can only inspect + delete.
    name = "Payment account"
    name_plural = "Payment accounts"
    icon = "fa-solid fa-link"
    can_create = False
    can_edit = False
    can_delete = True  # superadmin can revoke a tenant's connection


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
    column_list = [
        Course.id,
        Course.slug,
        Course.title,
        Course.visibility,
        Course.level,
        Course.price_cents,
        Course.currency,
        Course.org_id,
        Course.created_at,
    ]
    column_searchable_list = [Course.slug, Course.title]
    column_sortable_list = [
        Course.slug,
        Course.title,
        Course.visibility,
        Course.level,
        Course.price_cents,
        Course.created_at,
    ]
    form_columns = [
        Course.org_id,
        Course.slug,
        Course.title,
        Course.description,
        Course.visibility,
        Course.price_cents,
        Course.currency,
        Course.logo_url,
        Course.level,
        Course.tags,
    ]
    name = "Course"
    name_plural = "Courses"
    icon = "fa-solid fa-graduation-cap"
    can_create = True
    can_edit = True
    can_delete = True


class SectionAdmin(ModelView, model=Section):
    column_list = [
        Section.id,
        Section.slug,
        Section.title,
        Section.course_id,
        Section.position,
        Section.created_at,
    ]
    column_searchable_list = [Section.slug, Section.title]
    column_sortable_list = [Section.position, Section.slug, Section.created_at]
    form_columns = [
        Section.org_id,
        Section.course_id,
        Section.slug,
        Section.title,
        Section.description,
        Section.position,
    ]
    name = "Section"
    name_plural = "Sections"
    icon = "fa-solid fa-list"
    can_create = True
    can_edit = True
    can_delete = True


class PaymentAttemptAdmin(ModelView, model=PaymentAttempt):
    column_list = [
        PaymentAttempt.id,
        PaymentAttempt.status,
        PaymentAttempt.provider,
        PaymentAttempt.amount_cents,
        PaymentAttempt.currency,
        PaymentAttempt.user_id,
        PaymentAttempt.course_id,
        PaymentAttempt.org_id,
        PaymentAttempt.gateway_session_id,
        PaymentAttempt.created_at,
    ]
    column_searchable_list = [PaymentAttempt.gateway_session_id]
    column_sortable_list = [
        PaymentAttempt.created_at,
        PaymentAttempt.status,
        PaymentAttempt.amount_cents,
    ]
    name = "Payment attempt"
    name_plural = "Payment attempts"
    icon = "fa-solid fa-credit-card"
    can_create = False  # only the checkout endpoint should mint these
    can_edit = True  # admins can manually adjust status for refunds/disputes
    can_delete = False  # audit log; never delete


class EnrollmentAdmin(ModelView, model=Enrollment):
    column_list = [
        Enrollment.id,
        Enrollment.user_id,
        Enrollment.course_id,
        Enrollment.org_id,
        Enrollment.expires_at,
        Enrollment.created_at,
    ]
    column_sortable_list = [Enrollment.created_at, Enrollment.expires_at]
    form_columns = [
        Enrollment.user_id,
        Enrollment.org_id,
        Enrollment.course_id,
        Enrollment.expires_at,
    ]
    name = "Enrollment"
    name_plural = "Enrollments"
    icon = "fa-solid fa-user-check"
    can_create = True
    can_edit = True
    can_delete = True


class LessonAdmin(ModelView, model=Lesson):
    column_list = [
        Lesson.id,
        Lesson.slug,
        Lesson.title,
        Lesson.content_type,
        Lesson.section_id,
        Lesson.position,
        Lesson.created_at,
    ]
    column_searchable_list = [Lesson.slug, Lesson.title]
    column_sortable_list = [Lesson.position, Lesson.slug, Lesson.created_at]
    form_columns = [
        Lesson.org_id,
        Lesson.course_id,
        Lesson.section_id,
        Lesson.slug,
        Lesson.title,
        Lesson.content_type,
        Lesson.content,
        Lesson.position,
    ]
    name = "Lesson"
    name_plural = "Lessons"
    icon = "fa-solid fa-book-open"
    can_create = True
    can_edit = True
    can_delete = True
