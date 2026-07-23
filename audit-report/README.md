Add District Search Support for Parcel Booking Flow
Problem
The Passenger app needs to let users search stations by District (Quận/Huyện) when booking a parcel. Currently:

Feature Status
Search trips by originStationId + destinationStationId ✅ Supported
Search stations by name (q), city, province, locationId ✅ Supported
Search stations by District ❌ Not supported
The
Location
entity only allows PROVINCE / MUNICIPALITY types (enforced by a DB check constraint), and the
Station
entity has no district column.

Recommended Approach: Add District column to
Station
This is the minimal, non-breaking approach. It adds a nullable district string column to
Station
and exposes it as a new search filter — same pattern as the existing city/province filters. No changes to the
Location
catalog are needed.

IMPORTANT

This approach adds a new optional query parameter district to the existing GET v1/stations/search endpoint. It is fully backward-compatible — existing clients that don't send district will behave exactly as before.

Proposed Changes
Domain Layer
[MODIFY]
Station.cs
Add District property (nullable string), update
Create()
and
UpdateProfile()
to accept and set it.

diff
public string City { get; private set; } = string.Empty;
+public string? District { get; private set; }
public string Province { get; private set; } = string.Empty;
diff
public static Station Create(
string name,
string slug,
string city,
string province,

- string? district = null,
  ...
  Infrastructure Layer
  [MODIFY]
  StationConfiguration.cs
  Map new district column (varchar(100), nullable) and add a filtered index.

diff
builder.Property(x => x.Province)
.HasColumnName("province")
.HasMaxLength(100)
.IsRequired();
+builder.Property(x => x.District)

- .HasColumnName("district")
- .HasMaxLength(100)
- .IsRequired(false);
  diff
  builder.HasIndex(x => new { x.City, x.Province })
  .HasDatabaseName("idx_stations_city_province")
  .HasFilter("is_active = TRUE");
  +builder.HasIndex(x => x.District)
- .HasDatabaseName("idx_stations_district")
- .HasFilter("district IS NOT NULL AND is_active = TRUE");
  [NEW] EF Migration
  Run dotnet ef migrations add AddStationDistrict to generate the migration that:

Adds nullable district varchar(100) column to stations table
Creates idx_stations_district filtered index
[MODIFY]
StationRepository.cs
Add district parameter to
SearchActiveByNameAsync
and
BuildSearchActiveByNameQuery
.

diff
public async Task<IReadOnlyList<Station>> SearchActiveByNameAsync(
string? q,
string? city,

- string? district,
  string? province,
  Guid? locationId,
  CancellationToken cancellationToken)

* => await BuildSearchActiveByNameQuery(q, city, province, locationId).ToListAsync(cancellationToken);

- => await BuildSearchActiveByNameQuery(q, city, district, province, locationId).ToListAsync(cancellationToken);
  Inside
  BuildSearchActiveByNameQuery
  , add district filter block (same pattern as city/province):

diff
+if (!string.IsNullOrWhiteSpace(district))
+{

- var districtFilter = district.Trim();
- search = search.Where(station => station.District == districtFilter);
  +}
  Application Layer
  [MODIFY]
  IStationRepository.cs
  Add district parameter to
  SearchActiveByNameAsync
  interface method.

[MODIFY]
SearchStationsQuery.cs
diff
public sealed record SearchStationsQuery(
string? Q,
string? City,

- string? District,
  string? Province,
  Guid? LocationId) : IRequest<IReadOnlyList<StationSearchResult>>;
  [MODIFY]
  SearchStationsQueryValidator.cs
  Add District to
  HasSearchCriteria
  check:

diff
private static bool HasSearchCriteria(SearchStationsQuery query)
=> !string.IsNullOrWhiteSpace(query.Q)
|| !string.IsNullOrWhiteSpace(query.City)

-        || !string.IsNullOrWhiteSpace(query.District)
           || !string.IsNullOrWhiteSpace(query.Province)
           || query.LocationId.HasValue;
  [MODIFY]
  SearchStationsQueryHandler.cs
  Pass request.District to
  SearchActiveByNameAsync
  .

[MODIFY]
StationSearchResult.cs
Include District in the response DTO:

diff
public sealed record StationSearchResult(
Guid Id,
string Name,
Guid? LocationId,
string City,

- string? District,
  string Province,
  ...
  [MODIFY]
  StationMapper.cs
  Map station.District into both
  ToDto
  and
  ToSearchResult
  .

API Layer
[MODIFY]
StationsController.cs
Add [FromQuery] string? district parameter:

diff
public async Task<ActionResult<IReadOnlyList<StationSearchResult>>> SearchAsync(
[FromQuery(Name = "q")] string? q,
[FromQuery] string? city,

- [FromQuery] string? district,
  [FromQuery] string? province,
  [FromQuery] Guid? locationId,
  CancellationToken cancellationToken)
  {

* return Ok(await mediator.Send(new SearchStationsQuery(q, city, province, locationId), cancellationToken));

- return Ok(await mediator.Send(new SearchStationsQuery(q, city, district, province, locationId), cancellationToken));
  }
  Admin Endpoints (Optional — for data entry)
  [MODIFY]
  AdminStationsController.cs
  Add district to Create/Update station request models so admins can populate the field when managing stations.

Summary of Changes
GET /v1/stations/search?district=Quận 1
📱 Passenger App
StationsController
SearchStationsQuery(+district)
SearchStationsQueryHandler
StationRepositoryBuildSearchActiveByNameQuery(+district filter)
PostgreSQLstations.district column
StationSearchResult(+district)
Layer Files Changed
Domain
Station.cs
Infrastructure
StationConfiguration.cs
,
StationRepository.cs
, new EF migration
Application
IStationRepository.cs
,
SearchStationsQuery.cs
,
SearchStationsQueryValidator.cs
,
SearchStationsQueryHandler.cs
,
StationSearchResult.cs
,
StationMapper.cs
API
StationsController.cs
,
AdminStationsController.cs
Verification Plan
Existing Tests
The project has an integration test at
StationRepositorySearchTests.cs
that tests accent-insensitive station search via
SearchActiveByNameAsync
. After changes, this test should still pass (backward compatibility).

Proposed New Tests
Add a new test method in
StationRepositorySearchTests.cs
:

SearchActiveByNameAsync_FiltersByDistrict_ReturnsOnlyMatchingStations — Seeds two stations with different districts, queries with district="Quận 1", asserts only the correct station is returned.
Manual Verification
Since the BE is a microservice backend, the simplest manual verification is:

After applying the migration and seeding a station with district = "Quận 1", call:
GET /v1/stations/search?district=Quận 1
Verify the response includes only stations in "Quận 1" and the district field appears in the response body.
Verify calling without district parameter returns all stations (backward compat).
TIP

Ông nên yêu cầu team BE cập nhật seed data để populate field district cho các station hiện có. Nếu không seed thì field này sẽ là null cho tất cả station cũ, và search bằng district sẽ không trả ra kết quả nào.
