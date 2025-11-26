# Models package
from .church import Church, ChurchCreate, ChurchUpdate
from .user import User, UserCreate, UserLogin, UserResponse
from .member import Member, MemberCreate, MemberUpdate
# Community models (formerly Group)
from .community import (
    Community, CommunityCreate, CommunityUpdate, CommunitySettings,
    # Backward compatibility aliases
    Group, GroupCreate, GroupUpdate
)
from .community_membership import (
    CommunityMembership, CommunityMembershipCreate, CommunityMembershipUpdate,
    # Backward compatibility aliases
    GroupMembership, GroupMembershipCreate, GroupMembershipUpdate
)
from .community_join_request import (
    CommunityJoinRequest, CommunityJoinRequestCreate, CommunityJoinRequestUpdate,
    # Backward compatibility aliases
    GroupJoinRequest, GroupJoinRequestCreate, GroupJoinRequestUpdate
)
from .event import Event, EventCreate, EventUpdate
from .donation import Donation, DonationCreate, DonationUpdate
from .prayer_request import PrayerRequest, PrayerRequestCreate, PrayerRequestUpdate
from .content import Content, ContentCreate, ContentUpdate
from .spiritual_journey import SpiritualJourney, SpiritualJourneyCreate, SpiritualJourneyUpdate
from .member_status import MemberStatus, MemberStatusCreate, MemberStatusUpdate
from .member_status_rule import MemberStatusRule, MemberStatusRuleCreate, MemberStatusRuleUpdate
from .rule_evaluation_conflict import RuleEvaluationConflict, RuleEvaluationConflictCreate, RuleEvaluationConflictUpdate
from .member_status_history import MemberStatusHistory, MemberStatusHistoryCreate
from .demographic_preset import DemographicPreset, DemographicPresetCreate, DemographicPresetUpdate
from .church_settings import ChurchSettings, ChurchSettingsCreate, ChurchSettingsUpdate
from .seat_layout import SeatLayout, SeatLayoutCreate, SeatLayoutUpdate
from .event import Event, EventCreate, EventUpdate, SessionBase

__all__ = [
    'Church', 'ChurchCreate', 'ChurchUpdate',
    'User', 'UserCreate', 'UserLogin', 'UserResponse',
    'Member', 'MemberCreate', 'MemberUpdate',
    # Community (new naming)
    'Community', 'CommunityCreate', 'CommunityUpdate', 'CommunitySettings',
    'CommunityMembership', 'CommunityMembershipCreate', 'CommunityMembershipUpdate',
    'CommunityJoinRequest', 'CommunityJoinRequestCreate', 'CommunityJoinRequestUpdate',
    # Backward compatibility (deprecated)
    'Group', 'GroupCreate', 'GroupUpdate',
    'GroupMembership', 'GroupMembershipCreate', 'GroupMembershipUpdate',
    'GroupJoinRequest', 'GroupJoinRequestCreate', 'GroupJoinRequestUpdate',
    'Event', 'EventCreate', 'EventUpdate',
    'Donation', 'DonationCreate', 'DonationUpdate',
    'PrayerRequest', 'PrayerRequestCreate', 'PrayerRequestUpdate',
    'Content', 'ContentCreate', 'ContentUpdate',
    'SpiritualJourney', 'SpiritualJourneyCreate', 'SpiritualJourneyUpdate',
    'MemberStatus', 'MemberStatusCreate', 'MemberStatusUpdate',
    'MemberStatusRule', 'MemberStatusRuleCreate', 'MemberStatusRuleUpdate',
    'RuleEvaluationConflict', 'RuleEvaluationConflictCreate', 'RuleEvaluationConflictUpdate',
    'MemberStatusHistory', 'MemberStatusHistoryCreate',
    'DemographicPreset', 'DemographicPresetCreate', 'DemographicPresetUpdate',
    'ChurchSettings', 'ChurchSettingsCreate', 'ChurchSettingsUpdate',
    'SeatLayout', 'SeatLayoutCreate', 'SeatLayoutUpdate',
    'Event', 'EventCreate', 'EventUpdate', 'SessionBase',
]
