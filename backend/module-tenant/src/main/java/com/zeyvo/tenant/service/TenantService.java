package com.zeyvo.tenant.service;

import com.zeyvo.common.web.DomainException;
import com.zeyvo.tenant.api.dto.*;
import com.zeyvo.tenant.domain.Branch;
import com.zeyvo.tenant.domain.Organization;
import com.zeyvo.tenant.domain.QueueService;
import com.zeyvo.tenant.domain.WindowDesk;
import com.zeyvo.tenant.api.dto.OperatingHoursDto;
import com.zeyvo.tenant.domain.OperatingHours;
import com.zeyvo.tenant.infra.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final OrganizationRepository orgRepo;
    private final BranchRepository branchRepo;
    private final QueueServiceRepository serviceRepo;
    private final WindowDeskRepository windowRepo;
    private final OperatingHoursRepository hoursRepo;

    @PersistenceContext
    private EntityManager em;

    // ── Branches ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public List<BranchDto> listBranches() {
        return listBranchesQuery(null);
    }

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public List<BranchDto> listBranchesByOrg(UUID orgId) {
        return listBranchesQuery(orgId);
    }

    @SuppressWarnings("unchecked")
    private List<BranchDto> listBranchesQuery(UUID orgId) {
        String sql = """
                SELECT b.id, b.organization_id, o.name AS org_name, b.slug, b.name, b.short_name,
                       b.type, b.address, b.lat, b.lng, b.timezone, b.capacity, b.active,
                       (SELECT COUNT(*) FROM app.ticket t
                        WHERE t.branch_id = b.id AND t.status IN ('waiting','called','serving')) AS active_tickets,
                       (SELECT COUNT(*) FROM app.window_desk w
                        WHERE w.branch_id = b.id AND w.status = 'open') AS open_windows,
                       COALESCE((SELECT ROUND(AVG(s.avg_duration_s))::int FROM app.service s
                        WHERE s.branch_id = b.id AND s.active = true), 300) AS avg_service_s
                FROM app.branch b
                JOIN app.organization o ON o.id = b.organization_id
                WHERE b.active = true
                """ + (orgId != null ? "AND b.organization_id = :orgId\n" : "") + """
                ORDER BY o.name, b.name
                """;
        var query = em.createNativeQuery(sql);
        if (orgId != null) query.setParameter("orgId", orgId);
        List<Object[]> rows = query.getResultList();
        return rows.stream().map(r -> new BranchDto(
                UUID.fromString(r[0].toString()),
                UUID.fromString(r[1].toString()),
                (String) r[2],
                (String) r[3],
                (String) r[4],
                (String) r[5],
                (String) r[6],
                (String) r[7],
                r[8] != null ? ((Number) r[8]).doubleValue() : null,
                r[9] != null ? ((Number) r[9]).doubleValue() : null,
                (String) r[10],
                ((Number) r[11]).intValue(),
                (Boolean) r[12],
                r[13] != null ? ((Number) r[13]).intValue() : 0,
                r[14] != null ? ((Number) r[14]).intValue() : 0,
                r[15] != null ? ((Number) r[15]).intValue() : 300
        )).toList();
    }

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> listOrgs() {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT o.id, o.name, o.slug, o.plan, o.active,
                       COUNT(b.id) AS branch_count
                FROM app.organization o
                LEFT JOIN app.branch b ON b.organization_id = o.id AND b.active = true
                WHERE o.active = true AND o.deleted_at IS NULL
                GROUP BY o.id
                ORDER BY o.name
                """).getResultList();
        return rows.stream().map(r -> {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", r[0].toString());
            m.put("name", r[1]);
            m.put("slug", r[2]);
            m.put("plan", r[3]);
            m.put("branchCount", r[5] != null ? ((Number) r[5]).intValue() : 0);
            return (java.util.Map<String, Object>) m;
        }).toList();
    }

    @Transactional(readOnly = true)
    public BranchDetailDto getBranchDetail(UUID branchId) {
        Branch b = branchRepo.findById(branchId)
                .orElseThrow(() -> DomainException.notFound("Branch", branchId));
        List<ServiceDto> services = serviceRepo
                .findByBranchIdAndActiveTrueOrderByDisplayOrderAsc(branchId)
                .stream().map(ServiceDto::from).toList();
        List<WindowDeskDto> windows = windowRepo
                .findByBranchIdOrderByNumberAsc(branchId)
                .stream().map(WindowDeskDto::from).toList();

        Number activeCount = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM app.ticket WHERE branch_id = :bid AND status IN ('waiting','called','serving')")
                .setParameter("bid", branchId)
                .getSingleResult();
        int activeTickets = activeCount != null ? activeCount.intValue() : 0;
        int openWindows = (int) windows.stream().filter(w -> "open".equals(w.status())).count();
        int avgServiceS = services.isEmpty() ? 300
                : (int) services.stream().mapToInt(ServiceDto::avgDurationS).average().orElse(300);

        return new BranchDetailDto(b.getId(), b.getOrganizationId(), b.getSlug(),
                b.getName(), b.getShortName(), b.getType(), b.getAddress(),
                b.getLat(), b.getLng(), b.getTimezone(), b.getCapacity(), b.isActive(),
                services, windows, activeTickets, openWindows, avgServiceS);
    }

    public List<ServiceDto> listServices(UUID branchId) {
        return serviceRepo.findByBranchIdAndActiveTrueOrderByDisplayOrderAsc(branchId)
                .stream().map(ServiceDto::from).toList();
    }

    public List<WindowDeskDto> listWindows(UUID branchId) {
        return windowRepo.findByBranchIdOrderByNumberAsc(branchId)
                .stream().map(WindowDeskDto::from).toList();
    }

    public QueueService getServiceOrThrow(UUID serviceId) {
        return serviceRepo.findById(serviceId)
                .orElseThrow(() -> DomainException.notFound("Service", serviceId));
    }

    public QueueService getServiceByCodeOrThrow(UUID branchId, String code) {
        return serviceRepo.findByBranchIdAndCode(branchId, code)
                .orElseThrow(() -> DomainException.notFound("Service", code));
    }

    public Branch getBranchOrThrow(UUID branchId) {
        return branchRepo.findById(branchId)
                .orElseThrow(() -> DomainException.notFound("Branch", branchId));
    }

    // ── Branch/window management ─────────────────────────────────────────────

    @Transactional
    public ServiceDto createService(UUID branchId, com.zeyvo.tenant.api.dto.CreateServiceRequest req) {
        branchRepo.findById(branchId)
                .orElseThrow(() -> DomainException.notFound("Branch", branchId));
        short nextOrder = (short) serviceRepo.findByBranchIdAndActiveTrueOrderByDisplayOrderAsc(branchId).size();
        QueueService svc = QueueService.builder()
                .branchId(branchId)
                .code(req.code().toUpperCase())
                .name(req.name())
                .avgDurationS(req.avgDurationS() != null ? req.avgDurationS() : 300)
                .priority(req.priority() != null ? req.priority() : 0)
                .displayOrder(nextOrder)
                .build();
        try {
            serviceRepo.save(svc);
        } catch (DataIntegrityViolationException e) {
            throw new DomainException("service.code_exists",
                    "Service with code " + req.code().toUpperCase() + " already exists in this branch",
                    HttpStatus.CONFLICT);
        }
        return ServiceDto.from(svc);
    }

    @Transactional
    public ServiceDto toggleService(UUID serviceId, boolean active) {
        QueueService svc = serviceRepo.findById(serviceId)
                .orElseThrow(() -> DomainException.notFound("Service", serviceId));
        svc.setActive(active);
        serviceRepo.save(svc);
        return ServiceDto.from(svc);
    }

    @Transactional
    public BranchDetailDto createBranch(UUID organizationId, com.zeyvo.tenant.api.dto.CreateBranchRequest req) {
        // Derive slug from name: lowercase, spaces→hyphen, strip non-alnum
        String slug = req.name().toLowerCase()
                .replaceAll("[^a-z0-9 ]", "")
                .trim().replaceAll("\\s+", "-");
        // Ensure unique slug within org
        if (branchRepo.findByOrganizationIdAndSlug(organizationId, slug).isPresent()) {
            slug = slug + "-" + System.currentTimeMillis() % 10000;
        }
        Branch b = Branch.builder()
                .organizationId(organizationId)
                .slug(slug)
                .name(req.name())
                .shortName(req.shortName())
                .type(req.type() != null ? req.type() : "general")
                .address(req.address())
                .capacity(req.capacity() != null ? req.capacity() : 100)
                .timezone(req.timezone() != null ? req.timezone() : "Asia/Tashkent")
                .build();
        branchRepo.save(b);
        return getBranchDetail(b.getId());
    }

    @Transactional
    public WindowDeskDto createWindow(UUID branchId, com.zeyvo.tenant.api.dto.CreateWindowRequest req) {
        branchRepo.findById(branchId)
                .orElseThrow(() -> DomainException.notFound("Branch", branchId));
        String[] codes = req.serviceCodes() != null
                ? req.serviceCodes().toArray(new String[0])
                : new String[0];
        WindowDesk w = WindowDesk.builder()
                .branchId(branchId)
                .number((short) req.number())
                .label(req.label())
                .status("closed")
                .serviceCodes(codes)
                .build();
        windowRepo.save(w);
        return WindowDeskDto.from(w);
    }

    public UUID getFirstOrgId() {
        return orgRepo.findAll().stream()
                .findFirst()
                .map(org -> org.getId())
                .orElseThrow(() -> new com.zeyvo.common.web.DomainException(
                        "org.not_found", "No organization exists yet. Run /v1/dev/seed first.",
                        org.springframework.http.HttpStatus.NOT_FOUND));
    }

    @Transactional
    public WindowDeskDto updateWindowStatus(UUID windowId, String status) {
        WindowDesk w = windowRepo.findById(windowId)
                .orElseThrow(() -> DomainException.notFound("Window", windowId));
        w.setStatus(status);
        windowRepo.save(w);
        return WindowDeskDto.from(w);
    }

    @Transactional
    public WindowDeskDto updateWindow(UUID windowId, com.zeyvo.tenant.api.dto.UpdateWindowRequest req) {
        WindowDesk w = windowRepo.findById(windowId)
                .orElseThrow(() -> DomainException.notFound("Window", windowId));
        if (req.label() != null) w.setLabel(req.label());
        if (req.serviceCodes() != null) w.setServiceCodes(req.serviceCodes().toArray(new String[0]));
        windowRepo.save(w);
        return WindowDeskDto.from(w);
    }

    @Transactional
    public ServiceDto updateService(UUID serviceId, com.zeyvo.tenant.api.dto.UpdateServiceRequest req) {
        QueueService svc = serviceRepo.findById(serviceId)
                .orElseThrow(() -> DomainException.notFound("Service", serviceId));
        if (req.name() != null) svc.setName(req.name());
        if (req.avgDurationS() != null) svc.setAvgDurationS(req.avgDurationS());
        if (req.priority() != null) svc.setPriority(req.priority());
        if (req.displayOrder() != null) svc.setDisplayOrder(req.displayOrder());
        serviceRepo.save(svc);
        return ServiceDto.from(svc);
    }

    @Transactional
    public void deleteService(UUID serviceId) {
        QueueService svc = serviceRepo.findById(serviceId)
                .orElseThrow(() -> DomainException.notFound("Service", serviceId));
        serviceRepo.delete(svc);
    }

    @Transactional
    public void deleteWindow(UUID windowId) {
        WindowDesk w = windowRepo.findById(windowId)
                .orElseThrow(() -> DomainException.notFound("Window", windowId));
        if (w.getServingTicket() != null) {
            throw new DomainException("window.in_use",
                    "Window is currently serving a ticket — mark it served or no-show first",
                    org.springframework.http.HttpStatus.CONFLICT);
        }
        windowRepo.delete(w);
    }

    @Transactional
    public BranchDetailDto updateBranch(UUID branchId, com.zeyvo.tenant.api.dto.UpdateBranchRequest req) {
        Branch b = branchRepo.findById(branchId)
                .orElseThrow(() -> DomainException.notFound("Branch", branchId));
        if (req.name() != null) b.setName(req.name());
        if (req.shortName() != null) b.setShortName(req.shortName());
        if (req.address() != null) b.setAddress(req.address());
        if (req.capacity() != null) b.setCapacity(req.capacity());
        if (req.timezone() != null) b.setTimezone(req.timezone());
        if (req.type() != null) b.setType(req.type());
        branchRepo.save(b);
        return getBranchDetail(branchId);
    }

    // ── Operating hours ───────────────────────────────────────────────────────

    public List<OperatingHoursDto> getOperatingHours(UUID branchId) {
        branchRepo.findById(branchId).orElseThrow(() -> DomainException.notFound("Branch", branchId));
        return OperatingHoursDto.fromAll(hoursRepo.findByBranchIdOrderByDayOfWeekAsc(branchId));
    }

    @Transactional
    public List<OperatingHoursDto> setOperatingHours(UUID branchId, List<OperatingHoursDto> dtos) {
        branchRepo.findById(branchId).orElseThrow(() -> DomainException.notFound("Branch", branchId));
        hoursRepo.deleteAllByBranchId(branchId);
        List<OperatingHours> hours = dtos.stream().map(d -> OperatingHours.builder()
                .branchId(branchId)
                .dayOfWeek((short) d.dayOfWeek())
                .openAt(java.time.LocalTime.parse(d.openAt()))
                .closeAt(java.time.LocalTime.parse(d.closeAt()))
                .build()
        ).toList();
        hoursRepo.saveAll(hours);
        return OperatingHoursDto.fromAll(hoursRepo.findByBranchIdOrderByDayOfWeekAsc(branchId));
    }

    // ── Dev seed ──────────────────────────────────────────────────────────────

    @Transactional
    public BranchDetailDto seedDemoData() {
        Organization org = orgRepo.findBySlug("asaka").orElseGet(() -> {
            Organization o = Organization.builder()
                    .slug("asaka")
                    .name("Asaka Bank")
                    .country("UZ").locale("uz").plan("trial")
                    .build();
            return orgRepo.save(o);
        });

        Branch branch = branchRepo.findByOrganizationIdAndSlug(org.getId(), "asaka-mu")
                .orElseGet(() -> {
                    Branch b = Branch.builder()
                            .organizationId(org.getId())
                            .slug("asaka-mu")
                            .name("Asaka Bank · Mirzo Ulugbek")
                            .shortName("Asaka MU")
                            .type("bank")
                            .address("Mirzo Ulugbek ko'chasi 32, Toshkent")
                            .lat(41.3111).lng(69.2797)
                            .capacity(100)
                            .build();
                    return branchRepo.save(b);
                });

        if (serviceRepo.findByBranchIdAndActiveTrueOrderByDisplayOrderAsc(branch.getId()).isEmpty()) {
            List<QueueService> services = List.of(
                    QueueService.builder().branchId(branch.getId()).code("A").name("Open an account").avgDurationS(360).displayOrder((short)0).build(),
                    QueueService.builder().branchId(branch.getId()).code("A").name("Card replacement").avgDurationS(240).displayOrder((short)1).build(),
                    QueueService.builder().branchId(branch.getId()).code("B").name("Wire transfer").avgDurationS(720).displayOrder((short)2).build(),
                    QueueService.builder().branchId(branch.getId()).code("B").name("Currency exchange").avgDurationS(120).displayOrder((short)3).build(),
                    QueueService.builder().branchId(branch.getId()).code("C").name("Consultation").avgDurationS(480).displayOrder((short)4).build()
            );
            serviceRepo.saveAll(services);
        }

        if (windowRepo.findByBranchIdOrderByNumberAsc(branch.getId()).isEmpty()) {
            List<WindowDesk> windows = List.of(
                    WindowDesk.builder().branchId(branch.getId()).number((short)1).label("Aziza T.").status("open").build(),
                    WindowDesk.builder().branchId(branch.getId()).number((short)2).label("Madina S.").status("open").build(),
                    WindowDesk.builder().branchId(branch.getId()).number((short)3).label("Dilshod K.").status("open").build(),
                    WindowDesk.builder().branchId(branch.getId()).number((short)4).label("Nilufar M.").status("open").build(),
                    WindowDesk.builder().branchId(branch.getId()).number((short)5).label("Bekzod R.").status("open").build(),
                    WindowDesk.builder().branchId(branch.getId()).number((short)6).label("— auto —").status("idle").build(),
                    WindowDesk.builder().branchId(branch.getId()).number((short)7).label("Lunch break").status("closed").build()
            );
            windowRepo.saveAll(windows);
        }

        return getBranchDetail(branch.getId());
    }
}
