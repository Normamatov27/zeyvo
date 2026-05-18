rootProject.name = "zeyvo-backend"

enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

dependencyResolutionManagement {
    repositories {
        mavenCentral()
        maven { url = uri("https://repo.spring.io/milestone") }
        maven { url = uri("https://jitpack.io") }
    }
    // libs.versions.toml in gradle/ is auto-discovered — no explicit versionCatalogs block needed
}

include(
    ":app",
    ":common-web",
    ":module-auth",
    ":module-queue",
    ":module-tenant",
    ":module-notification",
    ":module-analytics",
    ":module-realtime",
    ":module-adapter",
)
