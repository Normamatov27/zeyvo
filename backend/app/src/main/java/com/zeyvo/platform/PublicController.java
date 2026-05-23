package com.zeyvo.platform;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/public")
@RequiredArgsConstructor
public class PublicController {

    @PersistenceContext
    private EntityManager em;

    @PostMapping("/pageview")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trackPageView(@RequestBody Map<String, String> body, HttpServletRequest req) {
        String path = body.getOrDefault("path", "/");
        if (path.length() > 500) path = path.substring(0, 500);
        String referrer = body.get("referrer");
        if (referrer != null && referrer.length() > 1000) referrer = referrer.substring(0, 1000);

        String ip = req.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = req.getRemoteAddr();
        if (ip != null && ip.contains(",")) ip = ip.substring(0, ip.indexOf(",")).trim();

        em.createNativeQuery(
                "INSERT INTO app.page_view (path, ip, referrer) VALUES (:path, :ip::inet, :referrer)")
                .setParameter("path", path)
                .setParameter("ip", ip)
                .setParameter("referrer", referrer)
                .executeUpdate();
    }
}
