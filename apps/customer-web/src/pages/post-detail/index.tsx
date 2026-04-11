import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, Container, Panel } from "@paragliding/ui";
import { customerApi } from "@/shared/config/api";
import { SiteLayout } from "@/widgets/layout/site-layout";
import { WeatherShowcase } from "@/widgets/weather-showcase/weather-showcase";

export const PostDetailPage = () => {
  const { slug = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => customerApi.getPost(slug),
    enabled: Boolean(slug)
  });
  const { data: services = [] } = useQuery({
    queryKey: ["post-detail-services"],
    queryFn: () => customerApi.listServices()
  });
  const firstService = services[0];
  const today = useMemo(() => new Date(), []);
  const { data: forecast = [] } = useQuery({
    queryKey: ["post-detail-weather", firstService?.slug, today.getFullYear(), today.getMonth() + 1],
    queryFn: () => customerApi.getAvailability(firstService?.slug ?? "", today.getFullYear(), today.getMonth() + 1),
    enabled: Boolean(firstService?.slug)
  });

  const galleryImages = useMemo(
    () =>
      services
        .flatMap((service) => [service.hero_image, ...service.gallery_images])
        .filter(Boolean)
        .slice(0, 6),
    [services]
  );

  if (!data) {
    return (
      <SiteLayout>
        <section className="section">
          <Container>Dang tai bai viet...</Container>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="page-banner page-banner--posts">
        <div className="page-banner__image">
          <img src={data.cover_image} alt={data.title} />
          <div className="page-banner__overlay" />
        </div>
        <Container className="page-banner__content">
          <Badge>{new Date(data.published_at ?? data.created_at ?? "").toLocaleDateString("vi-VN")}</Badge>
          <h1>{data.title}</h1>
          <p>{data.excerpt}</p>
        </Container>
      </section>

      <section className="section">
        <Container className="post-detail-layout">
          <div className="stack">
            <Card>
              <Panel className="stack">
                <div className="post-detail__content" dangerouslySetInnerHTML={{ __html: data.content }} />
              </Panel>
            </Card>

            <Card className="info-card">
              <Panel className="stack-sm">
                <strong>Tiep tuc trai nghiem</strong>
                <p>
                  Sau khi tham khao bai viet, ban co the quay lai danh sach goi bay de chon lich phu hop voi
                  weather va nhu cau cua minh.
                </p>
                <Link to="/services">
                  <Button variant="secondary">Xem goi dich vu</Button>
                </Link>
              </Panel>
            </Card>
          </div>

          <aside className="post-detail-sidebar">
            <Card>
              <Panel className="stack-sm">
                <div className="post-sidebar-head">
                  <div>
                    <Badge>Bo suu tap</Badge>
                    <h3>Hinh anh noi bat</h3>
                  </div>
                  <Link to="/gallery">Xem tat ca</Link>
                </div>
                <div className="post-gallery-strip">
                  {galleryImages.map((image) => (
                    <img key={image} src={image} alt="SkyNest gallery" />
                  ))}
                </div>
              </Panel>
            </Card>

            <div className="post-weather-aside">
              <Badge>Thoi tiet</Badge>
              <h3>Dieu kien bay sap toi</h3>
              {forecast.length ? <WeatherShowcase days={forecast} /> : <p>Dang tai du bao thoi tiet.</p>}
            </div>
          </aside>
        </Container>
      </section>
    </SiteLayout>
  );
};
