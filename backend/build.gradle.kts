plugins {
    alias(libs.plugins.spring.boot) apply false
    alias(libs.plugins.spring.dep.mgmt) apply false
    java
}

allprojects {
    group = "com.zeyvo"
    version = "0.1.0-SNAPSHOT"

    repositories {
        mavenCentral()
        maven { url = uri("https://repo.spring.io/milestone") }
        maven { url = uri("https://jitpack.io") }
    }
}

subprojects {
    apply(plugin = "java-library")

    java {
        toolchain { languageVersion = JavaLanguageVersion.of(21) }
    }

    dependencies {
        // BOM imports via Gradle-native platform() — no Spring dep-mgmt plugin needed
        implementation(platform(rootProject.libs.spring.boot.bom))
        testImplementation(platform(rootProject.libs.testcontainers.bom))

        compileOnly(rootProject.libs.lombok)
        annotationProcessor(rootProject.libs.lombok)
        annotationProcessor(rootProject.libs.mapstruct.processor)
        implementation(rootProject.libs.mapstruct)

        testImplementation(rootProject.libs.spring.boot.starter.test)
        testImplementation(rootProject.libs.testcontainers.junit)
        testImplementation(rootProject.libs.archunit)
    }

    tasks.withType<JavaCompile> {
        options.compilerArgs.addAll(listOf(
            "-Amapstruct.defaultComponentModel=spring",
            "-parameters"
        ))
        options.encoding = "UTF-8"
    }

    tasks.withType<Test> {
        useJUnitPlatform()
        jvmArgs("-XX:+EnableDynamicAgentLoading")
    }
}

// Spring Boot plugin only on :app; dep-mgmt plugin on modules that use Spring starters
configure(subprojects.filter { it.name == "app" }) {
    apply(plugin = "org.springframework.boot")
    apply(plugin = "io.spring.dependency-management")
}

