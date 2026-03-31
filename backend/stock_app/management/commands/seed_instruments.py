import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from stock_app.models import Instrument


class Command(BaseCommand):
    help = "Seed Instrument records from the stock_app fixtures CSV file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            dest="csv_path",
            default=None,
            help="Optional path to a CSV file. Defaults to stock_app/fixtures/instruments.csv",
        )

    def handle(self, *args, **options):
        default_csv_path = Path(__file__).resolve().parents[2] / "fixtures" / "instruments.csv"
        csv_path = Path(options["csv_path"]) if options["csv_path"] else default_csv_path

        if not csv_path.exists():
            raise CommandError(f"CSV file not found: {csv_path}")

        created_count = 0
        existing_count = 0

        with csv_path.open(newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)

            if "name" not in (reader.fieldnames or []):
                raise CommandError('CSV file must contain a "name" column.')

            for row in reader:
                name = (row.get("name") or "").strip()
                if not name:
                    continue

                _, created = Instrument.objects.get_or_create(name=name)
                if created:
                    created_count += 1
                else:
                    existing_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Instrument seed complete. Created: {created_count}, Existing: {existing_count}"
            )
        )
