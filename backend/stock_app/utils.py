from django.db.models import Sum

def investor_contributions_map(project):
    """
    Return a dict {user_id: total_contribution} for a given project.
    """
    qs = (
        project.investment_project_details
        .values('investor')
        .annotate(total_contribution=Sum('amount'))
    )
    return {row['investor']: row['total_contribution'] for row in qs}
